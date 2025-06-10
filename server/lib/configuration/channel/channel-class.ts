import type { RegisterServerOptions } from '@peertube/peertube-types'
import { CHANNEL_CONFIG_MODE, type ChannelConfigMode, type ChannelConfigurationOptions } from '../../../../shared/lib/types'
import * as path from 'path'
import {
  getDefaultChannelConfigurationOptions,
  getRawChannelConfigurationOptions,
  storeChannelConfigurationOptions
} from './storage'
import { sanitizeChannelConfigurationOptions } from './sanitize'
import { RoomChannel } from 'lib/room-channel'
import { forbidSpecialCharsDefaultTolerance, noDuplicateDefaultDelay } from '../../../../shared/lib/constants'

let singleton: ChannelConfigManager | undefined

class ChannelConfigManager {
  protected readonly options: RegisterServerOptions
  protected readonly instanceConfigFilePath: string
  protected readonly logger: {
    debug: (s: string) => void
    info: (s: string) => void
    warn: (s: string) => void
    error: (s: string) => void
  }

  protected instanceConfig: ChannelConfigurationOptions

  constructor(params: {
    options: RegisterServerOptions
    instanceConfigFilePath: string
    instanceConfig: ChannelConfigurationOptions
  }) {
    this.options = params.options
    this.instanceConfigFilePath = params.instanceConfigFilePath
    this.instanceConfig = params.instanceConfig

    const logger = params.options.peertubeHelpers.logger
    this.logger = {
      debug: (s) => logger.debug('[ChannelConfigManager] ' + s),
      info: (s) => logger.info('[ChannelConfigManager] ' + s),
      warn: (s) => logger.warn('[ChannelConfigManager] ' + s),
      error: (s) => logger.error('[ChannelConfigManager] ' + s)
    }
  }

  /**
   * Instanciate the singleton
   */
  public static async initSingleton(options: RegisterServerOptions): Promise<ChannelConfigManager> {
    const instanceConfigFilePath = path.resolve(
      options.peertubeHelpers.plugin.getDataDirectoryPath(),
      'instanceChannelConfig.json'
    )
    const instanceConfig =
      (await getRawChannelConfigurationOptions(options, instanceConfigFilePath)) ||
      getDefaultChannelConfigurationOptions(options)

    singleton = new ChannelConfigManager({
      options,
      instanceConfigFilePath,
      instanceConfig
    })

    return singleton
  }

  /**
   * frees the singleton
   */
  public static async destroySingleton(): Promise<void> {
    if (!singleton) {
      return
    }
    singleton = undefined
  }

  /**
   * Gets the singleton, or raise an exception if it is too soon.
   * @returns the singleton
   */
  public static singleton(): ChannelConfigManager {
    if (!singleton) {
      throw new Error('ChannelConfigManager singleton is not initialized yet')
    }
    return singleton
  }

  // Instance Channel

  public getInstanceConfig(): ChannelConfigurationOptions {
    return JSON.parse(JSON.stringify(this.instanceConfig))
  }

  public async updateInstanceConfig(data: any): Promise<ChannelConfigurationOptions> {
    // Note: if !bot.enabled, we wont try to save hidden fields values, to minimize the risk of error
    if (data.bot?.enabled !== true) {
      data.bot = getDefaultChannelConfigurationOptions(this.options).bot
    }
    const instanceConfig = await sanitizeChannelConfigurationOptions(this.options, data)
    this.logger.debug('Data seems ok, storing them.')
    await storeChannelConfigurationOptions(this.options, this.instanceConfigFilePath, instanceConfig)
    this.instanceConfig = instanceConfig

    // FIXME update all channels config?
    return this.instanceConfig
  }

  // Regular Channels

  public async getChannelConfig(channelId: number | string, raw = true): Promise<ChannelConfigurationOptions> {
    const filePath = this._getChannelConfigFilePath(channelId)
    const channelConfig = await getRawChannelConfigurationOptions(this.options, filePath)

    if (raw) return channelConfig || this.instanceConfig
    return this._mergeChannelConfig(channelConfig)
  }

  public async updateChannelConfig(channelId: number | string, data: any): Promise<ChannelConfigurationOptions> {
    const filePath = this._getChannelConfigFilePath(channelId)

    // Note: if !bot.enabled, we wont try to save hidden fields values, to minimize the risk of error
    if (data.bot?.enabled !== true) {
      const channelConfig =
        (await getRawChannelConfigurationOptions(this.options, filePath)) ||
        getDefaultChannelConfigurationOptions(this.options)
      data.bot = channelConfig.bot
      data.bot.enabled = false
    }
    // TODO: Same for forbidSpecialChars/noDuplicate: if disabled, don't save reason and tolerance
    //   (disabling for now, because it is not acceptable to load twice the channel configuration.
    //   Must find better way)
    // if (req.body.bot?.enabled === true && req.body.bot.forbidSpecialChars?.enabled === false) {
    //   logger.debug('Bot disabled, loading the previous bot conf to not override hidden fields')
    //   const channelOptions =
    //     await getChannelConfigurationOptions(options, channelInfos.id) ??
    //     getDefaultChannelConfigurationOptions(options)
    //   req.body.bot.forbidSpecialChars.reason = channelOptions.bot.forbidSpecialChars.reason
    //   req.body.bot.forbidSpecialChars.tolerance = channelOptions.bot.forbidSpecialChars.tolerance
    //   req.body.bot.forbidSpecialChars.applyToModerators = channelOptions.bot.forbidSpecialChars.applyToModerators
    //   req.body.bot.forbidSpecialChars.enabled = false
    //    ... NoDuplicate...
    // }

    const channelConfig = await sanitizeChannelConfigurationOptions(this.options, data)
    this.logger.debug('Data seems ok, storing them.')
    await storeChannelConfigurationOptions(this.options, filePath, channelConfig)

    RoomChannel.singleton().refreshChannelConfigurationOptions(channelId)

    return channelConfig
  }

  // Common

  private _getChannelConfigFilePath(channelId: number | string): string {
    // some sanitization, just in case...
    channelId = parseInt(channelId.toString())
    if (isNaN(channelId)) {
      throw new Error(`Invalid channelId: ${channelId}`)
    }

    return path.resolve(
      this.options.peertubeHelpers.plugin.getDataDirectoryPath(),
      'channelConfigurationOptions',
      channelId.toString() + '.json'
    )
  }

  /**
   * Get saved configuration options for the given channel merged with instance wide options.
   * Can throw an exception.
   * @param options Peertube server options
   * @param channelId channel id
   * @returns Channel configuration data
   */
  private _mergeChannelConfig(channelConfig: ChannelConfigurationOptions | null): ChannelConfigurationOptions {
    const instanceConfig = this.getInstanceConfig()
    if (!channelConfig) return instanceConfig

    const { bot, slowMode, terms } = instanceConfig
    if (bot.enabled) {
      if (!channelConfig.bot.enabled) {
        channelConfig.bot = bot
      } else {
        channelConfig.bot.forbiddenWords = [...bot.forbiddenWords, ...channelConfig.bot.forbiddenWords]
        channelConfig.bot.commands = [...bot.commands, ...channelConfig.bot.commands]
        if (bot.forbidSpecialChars.enabled) {
          channelConfig.bot.forbidSpecialChars = bot.forbidSpecialChars
        }
        if (bot.noDuplicate.enabled) {
          channelConfig.bot.noDuplicate = bot.noDuplicate
        }
      }
    }

    if (slowMode.duration) {
      channelConfig.slowMode.duration = slowMode.duration
    }

    if (terms) {
      channelConfig.terms = channelConfig.terms ? `${terms}\n\n${channelConfig.terms}` : terms
    }

    return channelConfig
  }
}

function _getDefaultConfig<Mode extends ChannelConfigMode = 'regular'>(mode: Mode = CHANNEL_CONFIG_MODE.regular) {
  const withForceValue = <T>(value: T): => ({ value, force: false })
  return {
    bot: {
      enabled: false, // can force
      nickname: 'Sepia',
      forbiddenWords: [], // can force + merge
      forbidSpecialChars: {
        // can force + merge
        enabled: false,
        reason: '',
        tolerance: forbidSpecialCharsDefaultTolerance,
        applyToModerators: false
      },
      noDuplicate: {
        // can force
        enabled: false,
        reason: '',
        delay: noDuplicateDefaultDelay,
        applyToModerators: false
      },
      quotes: [],
      commands: [] // merge
    },
    slowMode: {
      duration: 0 // can force
    },
    mute: {
      anonymous: false
    },
    moderation: {
      delay: 0,
      anonymize: false
    },
    terms: undefined // can force + merge
  }
}

export { ChannelConfigManager }
