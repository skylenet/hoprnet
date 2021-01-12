// import { NODES } from '@hoprnet/hopr-demo-seeds'
import { PacketAcknowledgementInteraction } from './acknowledgement'
import { iterateHash, recoverIteratedHash } from '@hoprnet/hopr-utils'
import type { Intermediate } from '@hoprnet/hopr-utils'
import { Types } from '@hoprnet/hopr-core-connector-interface'
import { createHash, randomBytes } from 'crypto'
import * as DbKeys from '../../dbKeys'
import Memdown from 'memdown'
import LevelUp from 'levelup'
import secp256k1 from 'secp256k1'

const MAX_ITERATIONS = 20
const STEP_SIZE = 5

const HASH_SIZE = 32
describe('test acknowledgement handling', function () {
  const hashFunc = (msg: Uint8Array) => createHash('sha256').update(msg).digest()

  let hashes: {
    hash: Uint8Array
    intermediates: Intermediate[]
  }

  let currentHashedSecret: Uint8Array

  function getFakeConnector() {
    return {
      account: {
        async reservePreImageIfIsWinning(acknowledgedTicket: Types.AcknowledgedTicket) {
          acknowledgedTicket.preImage = (
            await recoverIteratedHash(
              currentHashedSecret,
              hashFunc,
              (index: number) =>
                Promise.resolve(hashes.intermediates.find((intermediate) => intermediate.iteration == index)?.preImage),
              MAX_ITERATIONS,
              STEP_SIZE
            )
          ).preImage

          return true
        }
      },
      utils: {
        async hash(msg: Uint8Array): Promise<Uint8Array> {
          return Promise.resolve(hashFunc(msg))
        }
      },
      types: {
        AcknowledgedTicket: {
          async create(..._args: any[]) {}
        }
      }
    }
  }

  before(async function () {
    hashes = await iterateHash(randomBytes(HASH_SIZE), hashFunc, MAX_ITERATIONS, STEP_SIZE)
    currentHashedSecret = hashes.hash
  })

  it('should handle an acknowledgement and update the database appropriately', async function () {
    console.log(hashes)
    const node = {
      paymentChannels: getFakeConnector(),
      db: LevelUp(Memdown()),
      _dbKeys: DbKeys,
      _libp2p: {
        handle() {}
      }
    }
    const AcknowledgementInteration = new PacketAcknowledgementInteraction(node as any)

    const preImage = randomBytes(HASH_SIZE)
    const unacknowledgedTicketKey = node._dbKeys.UnAcknowledgedTickets(hashFunc(preImage))

    const unacknowledgedTicket = {
      signedTicket: {},
      secretA: randomBytes(HASH_SIZE)
    }
    // "handle a ticket"
    // "store in database"
    // "store a second ticket"
    // "verify database structure"

    AcknowledgementInteration.handleAcknowledgement(
      unacknowledgedTicketKey,
      {
        hashedKey: Promise.resolve(hashFunc(preImage)),
        key: preImage,
        responseSigningParty: Promise.resolve(secp256k1.publicKeyCreate(randomBytes(32)))
      } as any,
      unacknowledgedTicket as any
    )
  })
})
