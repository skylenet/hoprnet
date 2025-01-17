import type { HoprOptions } from '.'

import { LevelUp } from 'levelup'
import { blue } from 'chalk'
import { deserializeKeyPair, serializeKeyPair, askForPassword } from './utils'
import debug from 'debug'

const log = debug('hopr-core:identity')

import PeerId from 'peer-id'
import Multiaddr from 'multiaddr'

import { KeyPair } from './dbKeys'

const DEFAULT_PORT = 9091
/**
 * Assemble the addresses that we are using
 */
function getAddrs(id: PeerId, options: HoprOptions): Multiaddr[] {
  const addrs = []

  if (options.hosts === undefined || (options.hosts.ip4 === undefined && options.hosts.ip6 === undefined)) {
    addrs.push(Multiaddr(`/ip4/0.0.0.0/tcp/${DEFAULT_PORT}`))
  }

  if (options.hosts !== undefined) {
    if (options.hosts.ip4 === undefined && options.hosts.ip6 === undefined) {
      throw Error(`Unable to detect to which interface we should listen`)
    }

    if (options.hosts.ip4 !== undefined) {
      addrs.push(Multiaddr(`/ip4/${options.hosts.ip4.ip}/tcp/${options.hosts.ip4.port}`))
    }

    if (options.hosts.ip6 !== undefined) {
      addrs.push(Multiaddr(`/ip6/${options.hosts.ip6.ip}/tcp/${options.hosts.ip6.port}`))
    }
  }

  return addrs.map((addr: Multiaddr) => addr.encapsulate(`/p2p/${id.toB58String()}`))
}

async function getPeerId(options: HoprOptions): Promise<PeerId> {
  if (options.peerId != null && PeerId.isPeerId(options.peerId)) {
    return options.peerId
  }

  if (options.db == null) {
    throw Error('Cannot get/store any peerId without a database handle.')
  }

  return getFromDatabase(options.db, options.password)
}

/**
 * Try to retrieve Id from database
 * @param db database handle
 * @param pw password to keypair decrypt
 */
async function getFromDatabase(db: LevelUp, pw?: string): Promise<PeerId> {
  let serializedKeyPair: Uint8Array

  try {
    serializedKeyPair = await db.get(Buffer.from(KeyPair))
  } catch (err) {
    log('Error loading keys from db', err)
    // No identity in database
    return createIdentity(db, pw)
  }

  return recoverIdentity(serializedKeyPair, pw)
}

async function recoverIdentity(serializedKeyPair: Uint8Array, pw?: string): Promise<PeerId> {
  let peerId: PeerId

  if (pw !== undefined) {
    try {
      return await deserializeKeyPair(serializedKeyPair, new TextEncoder().encode(pw))
    } catch (err) {
      // Exit with error message
      console.log(`Could not recover id from database with given password.`)
      process.exit(1)
    }
  }

  while (true) {
    pw = await askForPassword('Please type in the password that was used to encrypt to key.')

    try {
      peerId = await deserializeKeyPair(serializedKeyPair, new TextEncoder().encode(pw))
      break
    } catch {}
  }

  log(`Successfully recovered ${blue(peerId.toB58String())} from database.`)

  return peerId
}

async function createIdentity(db: LevelUp, pw?: string): Promise<PeerId> {
  pw = pw !== undefined ? pw : await askForPassword('Please type in a password to encrypt the secret key.')

  const peerId = await PeerId.create({ keyType: 'secp256k1' })

  const serializedKeyPair = serializeKeyPair(peerId, new TextEncoder().encode(pw))

  await db.put(Buffer.from(KeyPair), Buffer.from(serializedKeyPair))

  return peerId
}

export default async function getIdentity(options: HoprOptions) {
  let id = await getPeerId(options)

  return {
    id,
    addresses: getAddrs(id, options)
  }
}
