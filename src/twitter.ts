import { TWITTER_API_ACCESS_TOKEN, TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_API_ACCESS_TOKEN_SECRET, TWITTER_BLACKLISTED } from './env'
import TwitterClient from '@hoprnet/twitter-api-client'
import tweetMock from './tweetMock.json'

const twitterClient = new TwitterClient({
  apiKey: TWITTER_API_KEY,
  apiSecret: TWITTER_API_SECRET,
  accessToken: TWITTER_API_ACCESS_TOKEN,
  accessTokenSecret: TWITTER_API_ACCESS_TOKEN_SECRET,
})

export class TweetState {
    hasMention: boolean = false
    hasTag: boolean = false
    sameNode: boolean = false
  
    public isValid() {
      return this.hasTag && this.hasMention && this.sameNode
    }
  }

export class TweetMessage {
    url: string
    id: string
    status: TweetState
    created_at: Date
    screen_name: string
    hasfetched: boolean
    followers_count: number
    hashtags: any
    user_mentions: any
    content: string

    constructor(url: string) {
        const tweet = url.match(/https:\/\/twitter.com.*?$/i)
        if (!tweet) throw new Error('Invalid Tweet Url')
        this.id = (tweet_regexed => tweet_regexed.pop())(tweet[0].split('/') || [])
        this.url = url
        this.hasfetched = false
    }

    async fetch(options?:{mock: boolean}) {
        this.status = new TweetState()
        const data = (options && options.mock) ? tweetMock : await twitterClient.tweets.statusesShowById({ id: this.id, tweet_mode: 'extended' })
        this.url = `https://twitter.com/${data.user.screen_name}/status/${data.id_str}`
        this.id = `${data.id_str}`
        this.hashtags = data.entities.hashtags
        this.user_mentions = data.entities.user_mentions
        this.content = data.full_text || data.text
        this.followers_count = data.user.followers_count
        this.screen_name = data.user.screen_name
        this.created_at = new Date(data.created_at)
        this.hasfetched = true
        console.log(`The tweet was created on ${this.created_at}`)
        console.log('The tweet has following hashtags', this.hashtags);
        console.log('The tweet has following user_mentions', this.user_mentions);
        console.log('Here is the tweet', this.content);
    }

    isAfterTimestamp(timestamp: Date): boolean {
        return this.created_at > timestamp
    }

    hasTag(tag: string): boolean {
        return this.hashtags.some(hashtag => (hashtag.text as string).toLowerCase() === tag)
    }

    hasMention(mention: string): boolean {
        return this.user_mentions.some(user => (user.screen_name as string).toLowerCase() === mention)
    }

    isBlackListed(screen_name: string): boolean {
        const alreadyParticipants = TWITTER_BLACKLISTED.split(',')
        return alreadyParticipants.includes(screen_name)
    }

    hasEnoughFollowers(followers_count: number): boolean {
        //@TODO Move this to an env variable for later usage
        return followers_count > 100
    }

    getHOPRNode(): string   {
        console.log('Tweet Content', this.content)
        return this.content.match(/16Uiu2HA.*?$/i) ?
            (tweetContent => {
                const [participantHOPRAddress_regexed] = tweetContent.match(/16Uiu2HA.*?$/i)
                const participantHOPRAddress = participantHOPRAddress_regexed.substr(0, 53)
                console.log('HoprAddress', participantHOPRAddress)
                return participantHOPRAddress;
            })(this.content)
            : ''
    }
    
    hasSameHOPRNode(hoprAddress: string): boolean {
        return this.content.match(/16Uiu2HA.*?$/i) ?
            (tweetContent => {
                const [participantHOPRAddress_regexed] = tweetContent.match(/16Uiu2HA.*?$/i)
                const participantHOPRAddress = participantHOPRAddress_regexed.substr(0, 53)
                return participantHOPRAddress === hoprAddress;
            })(this.content) 
            : false
    }
}
