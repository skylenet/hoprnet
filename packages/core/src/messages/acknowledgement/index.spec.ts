import assert from 'assert'
import PeerId from 'peer-id'
import { AcknowledgementMessage } from '.'
import { Challenge } from '../packet/challenge'
import { u8aEquals } from '@hoprnet/hopr-utils'
import BN from 'bn.js'
import { Hash } from '@hoprnet/hopr-core-ethereum'
import { randomBytes } from 'crypto'
import secp256k1 from 'secp256k1'

describe('test acknowledgement generation', function () {
  it('should generate a valid acknowledgement', async function () {
    const sender = await PeerId.create({
      keyType: 'secp256k1'
    })

    const receiver = await PeerId.create({
      keyType: 'secp256k1'
    })

    for (let i = 0; i < 10; i++) {
      const secret = randomBytes(32)

      const challenge = await Challenge.create(new Hash(secret), new BN(0)).sign(sender)
      assert(await challenge.verify(sender), `Previously generated challenge should be valid.`)

      const pubKey = sender.pubKey.marshal()
      assert(u8aEquals(await challenge.counterparty, pubKey), `recovered pubKey should be equal.`)

      const ack = await AcknowledgementMessage.create(challenge, secp256k1.publicKeyCreate(secret), receiver)

      assert(await ack.verify(receiver), `Previously generated acknowledgement should be valid.`)
      assert(u8aEquals(await ack.responseSigningParty, receiver.pubKey.marshal()), `recovered pubKey should be equal.`)
    }
  })
})
