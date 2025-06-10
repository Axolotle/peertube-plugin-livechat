import { RegisterServerOptions } from '@peertube/peertube-types'
import { ChannelConfigurationOptions } from '../../../../shared/lib/types'
import { getChannelConfigurationOptions } from './storage'

/**
 * Merge instance wide configuration with a given channel configuration.
 * @param options Peertube server options
 * @param ChannelConfigurationOptions configuration to merge
 * @returns merged configuration
 */
async function mergeChannelConfigWithInstanceChannelConfig (
  options: RegisterServerOptions,
  channelConfigurationOptions: ChannelConfigurationOptions
): Promise<ChannelConfigurationOptions> {
  const logger = options.peertubeHelpers.logger

  const instanceConfig = await getChannelConfigurationOptions(options, 'instance')
  if (!instanceConfig) {
    logger.debug('No instance wide channel configuration found, returning untouched channel configuration')
    return channelConfigurationOptions
  }

  // Override options
  if (instanceConfig.bot.enabled) {

  } else {

  }
}

// TODO
/*
- migration
-
*/
export {
  mergeChannelConfigWithInstanceChannelConfig
}
