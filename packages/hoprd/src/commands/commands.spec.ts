import * as mod from './index'
import assert from 'assert'
import type { CommandResponse } from './abstractCommand'
// @ts-ignore
import sinon from 'sinon'

const assertMatch = (test: CommandResponse, pattern: RegExp) => {
  if (!test) {
    throw new Error('cannot match empty string')
  }
  assert(test.match(pattern), `${test} should match ${pattern}`)
}

let mockNode = sinon.fake() as any

describe('Commands', () => {
  it('can import commands', () => {
    assert(mod)
  })

  it('can construct Commands object', () => {
    assert(mod.Commands)
    let cmds = new mod.Commands(mockNode)
    assert(cmds)
  })

  it('responds to nonsense commands', async () => {
    assert(mod.Commands)
    let cmds = new mod.Commands(mockNode)
    assertMatch(await cmds.execute('not-a-real-command'), /unknown command/i)
  })

  it('ping', async () => {
    mockNode.bootstrapServers = []
    mockNode.ping = sinon.fake.returns({ info: '', latency: 10 })
    let mockPeerId = '16Uiu2HAkyXRaL7fKu4qcjaKuo4WXizrpK63Ltd6kG2tH6oSV58AW'
    let cmds = new mod.Commands(mockNode)
    assertMatch(await cmds.execute(`ping  ${mockPeerId}`), /pong/i)
    assert(mockNode.ping.calledOnce)
  })

  it('help', async () => {
    let mockNode: any = sinon.fake()
    let cmds = new mod.Commands(mockNode)
    assertMatch(await cmds.execute('help'), /help/)
  })

  /* DISABLED as broken in monorepo. TODO fix
  it('listConnectors', async() => {
    let mockNode: any = sinon.fake()
    let cmds = new mod.Commands(mockNode)
    assert(await cmds.execute('listConnectors')).toMatch(/ethereum/)
  })
  */

  it('send message', async () => {
    mockNode.sendMessage = sinon.fake()
    let cmds = new mod.Commands(mockNode)
    await cmds.execute('send 16Uiu2HAmAJStiomwq27Kkvtat8KiEHLBSnAkkKCqZmLYKVLtkiB7 Hello, world')
    assert(mockNode.sendMessage.calledOnce, 'send message not called')
    assertMatch(await cmds.execute('send unknown-alias Hello, world'), /invalid/i)

    await cmds.execute('alias 16Uiu2HAmAJStiomwq27Kkvtat8KiEHLBSnAkkKCqZmLYKVLtkiB7 test')
    await cmds.execute('alias 16Uiu2HAkyXRaL7fKu4qcjaKuo4WXizrpK63Ltd6kG2tH6oSV58AW test2')
    await cmds.execute('send test,test2 Hello, world')
    assert(mockNode.sendMessage.calledTwice, 'send message not called')
    await cmds.execute('send ,test2 Hello, world')
    assert(mockNode.sendMessage.callCount == 3, 'send message not called x3')
  })

  it('autocomplete sendmessage', async () => {
    let mockNode: any = sinon.fake()
    mockNode.sendMessage = sinon.fake()
    mockNode.bootstrapServers = []
    mockNode.getConnectedPeers = () => [{ toB58String: () => '16Uiu2HAmAJStiomwq27Kkvtat8KiEHLBSnAkkKCqZmLYKVLtkiB7' }]

    let cmds = new mod.Commands(mockNode)
    assertMatch((await cmds.autocomplete('send 16Ui'))[0][0], /send 16U/)
    assert((await cmds.autocomplete('send foo'))[0][0] == '')

    await cmds.execute('alias 16Uiu2HAmAJStiomwq27Kkvtat8KiEHLBSnAkkKCqZmLYKVLtkiB7 test')
    assert((await cmds.autocomplete('send t'))[0][0] == 'send test')
  })

  it('settings', async () => {
    let mockNode: any = sinon.fake()
    mockNode.getChannelStrategy = (): string => ''
    let cmds = new mod.Commands(mockNode)

    let ir = await cmds.execute('settings')
    assertMatch(ir, /includeRecipient/)
  })

  it('settings includeRecipient', async () => {
    let mockNode: any = sinon.fake()
    let cmds = new mod.Commands(mockNode)

    let ir = await cmds.execute('settings includeRecipient')
    assertMatch(ir, /false/)
    await cmds.execute('settings includeRecipient true')
    ir = await cmds.execute('settings includeRecipient')
    assertMatch(ir, /true/)
    await cmds.execute('settings includeRecipient false')
    ir = await cmds.execute('settings includeRecipient')
    assertMatch(ir, /false/)
  })

  it('settings strategy', async () => {
    let mockNode: any = sinon.fake()
    let setCalled = 'promiscuous'
    mockNode.setChannelStrategy = (s: string) => {
      setCalled = s
    }
    mockNode.getChannelStrategy = (): string => setCalled
    let cmds = new mod.Commands(mockNode)

    let ir = await cmds.execute('settings strategy')
    assertMatch(ir, /promiscuous/)
    await cmds.execute('settings strategy passive')
    assert(setCalled === 'passive')
  })

  it('alias addresses', async () => {
    let mockNode: any = sinon.fake()
    mockNode.sendMessage = sinon.fake()
    let cmds = new mod.Commands(mockNode)

    let aliases = await cmds.execute('alias')
    assertMatch(aliases, /No aliases found/)

    await cmds.execute('alias 16Uiu2HAmQDFS8a4Bj5PGaTqQLME5SZTRNikz9nUPT3G4T6YL9o7V test')

    aliases = await cmds.execute('alias')
    assertMatch(aliases, /test/)
    await cmds.execute('send test Hello, world')
    assert(mockNode.sendMessage.calledOnce)
  })

  it('fund channel', async () => {
    const channelId = '16Uiu2HAmAJStiomwq27Kkvtat8KiEHLBSnAkkKCqZmLYKVLtkiB7'
    let mockNode: any = sinon.fake()
    mockNode.fundChannel = sinon.fake(async () => ({
      channelId: {
        toHex: () => channelId
      }
    }))

    let cmds = new mod.Commands(mockNode)
    assertMatch(await cmds.execute(`fund ${channelId} 10 15`), /Successfully funded channel/)
    assertMatch(await cmds.execute(`fund ${channelId} 10`), /usage:/)
    assertMatch(await cmds.execute(`fund ${channelId} 10 y`), /is not a number/)
  })

  it('close channel', async () => {
    let mockNode: any = sinon.fake()
    mockNode.closeChannel = sinon.fake(async () => ({
      status: undefined
    }))

    let cmds = new mod.Commands(mockNode)
    const r = await cmds.execute('close 16Uiu2HAmAJStiomwq27Kkvtat8KiEHLBSnAkkKCqZmLYKVLtkiB7')
    assertMatch(r, /Initiated channel closure/)
  })

  it('cover traffic', async () => {
    var clock = sinon.useFakeTimers(Date.now())
    let mockNode: any = sinon.fake()
    let receive
    mockNode.on = (ev, f) => {
      assert(ev == 'hopr:message')
      receive = f
    }
    mockNode.getId = () => 'node'
    mockNode.sendMessage = (m, id) => {
      assert(m, 'send message takes message')
      assert(id == mockNode.getId(), 'sends to self')
      setTimeout(() => receive(m), 300)
      return Promise.resolve()
    }
    let cmds = new mod.Commands(mockNode)
    assertMatch(await cmds.execute('covertraffic start'), /started/)
    await clock.tickAsync(30_000)
    assertMatch(await cmds.execute('covertraffic stop'), /stopped/)
    assertMatch(await cmds.execute('covertraffic stats'), /messages sent/)
    assertMatch(await cmds.execute('covertraffic stats'), /reliability/)

    clock.restore()
  })
})
