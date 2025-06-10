// SPDX-FileCopyrightText: 2024-2025 John Livingston <https://www.john-livingston.fr/>
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { RegisterServerOptions } from '@peertube/peertube-types'
import type { Router, Request, Response, NextFunction } from 'express'
import type { ChannelConfiguration, ChannelEmojisConfiguration, ChannelInfos } from '../../../../shared/lib/types'
import { asyncMiddleware } from '../../middlewares/async'
import { getCheckConfigurationChannelMiddleware } from '../../middlewares/configuration/channel'
import { checkConfigurationEnabledMiddleware } from '../../middlewares/configuration/configuration'
import {
  getChannelConfigurationOptions,
  getDefaultChannelConfigurationOptions,
  getRawChannelConfigurationOptions,
  storeChannelConfigurationOptions
} from '../../configuration/channel/storage'
import { sanitizeChannelConfigurationOptions } from '../../configuration/channel/sanitize'
import { getConverseJSParams } from '../../../lib/conversejs/params'
import { Emojis } from '../../../lib/emojis'
import { RoomChannel } from '../../../lib/room-channel'
import { updateProsodyRoom } from '../../../lib/prosody/api/manage-rooms'
import { isUserAdmin } from 'lib/helpers'
import { ChannelConfigManager } from 'lib/configuration/channel/channel-class'

async function initConfigurationApiRouter (options: RegisterServerOptions, router: Router): Promise<void> {
  const logger = options.peertubeHelpers.logger

  router.get('/configuration/room/:roomKey', asyncMiddleware(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const roomKey = req.params.roomKey

      const user = await options.peertubeHelpers.user.getAuthUser(res)

      const initConverseJSParam = await getConverseJSParams(
        options,
        roomKey,
        {
          forcetype: req.query.forcetype === '1'
        },
        !!user
      )
      if (('isError' in initConverseJSParam) && initConverseJSParam.isError) {
        res.sendStatus(initConverseJSParam.code)
        return
      }
      res.status(200)
      res.json(initConverseJSParam)
    }
  ))

  router.get('/configuration/instance-channel', asyncMiddleware([
    async (req: Request, res: Response) => {
      const { getInstanceConfig } = ChannelConfigManager.singleton()
      res.status(200)
      res.json({ configuration: getInstanceConfig() })
    }
  ]))

  class ValidationError extends Error {}

  router.post('/configuration/instance-channel', asyncMiddleware([
    async (req: Request, res: Response, _next: NextFunction) => {
      if (!await isUserAdmin(options, res)) {
        logger.warn('Non-admin user tries to update the instance channel configuration.')
        res.sendStatus(403)
        return
      }

      try {
        const { updateInstanceConfig } = ChannelConfigManager.singleton()
        const instanceConfig = await updateInstanceConfig(req.body)
        res.status(200)
        res.json({ configuration: instanceConfig })
      } catch (err) {
        logger.warn(err)
        res.sendStatus(err instanceof ValidationError ? 400 : 500)
      }
    }
  ]))

  router.get('/configuration/channel/:channelId', asyncMiddleware([
    checkConfigurationEnabledMiddleware(options),
    getCheckConfigurationChannelMiddleware(options),
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      if (!res.locals.channelInfos) {
        logger.error('Missing channelInfos in res.locals, should not happen')
        res.sendStatus(500)
        return
      }
      const channelInfos = res.locals.channelInfos as ChannelInfos
      const { getChannelConfig } = ChannelConfigManager.singleton()
      // const channelOptions =
      //   await getChannelConfigurationOptions(options, channelInfos.id) ??
      //   getDefaultChannelConfigurationOptions(options)

      const result: ChannelConfiguration = {
        channel: channelInfos,
        configuration: await getChannelConfig(channelInfos.id)
      }
      res.status(200).json(result)
    }
  ]))

  router.post('/configuration/channel/:channelId', asyncMiddleware([
    checkConfigurationEnabledMiddleware(options),
    getCheckConfigurationChannelMiddleware(options),
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      if (!res.locals.channelInfos) {
        logger.error('Missing channelInfos in res.locals, should not happen')
        res.sendStatus(500)
        return
      }
      const channelInfos = res.locals.channelInfos as ChannelInfos
      logger.debug('Trying to save ChannelConfigurationOptions')

      // let channelOptions
      try {
        // Note: the front-end should do some input validation.
        // If there is any invalid value, we just return a 400 error.
        // The frontend should have prevented to post invalid data.
        const { updateChannelConfig } = ChannelConfigManager.singleton()
        const result: ChannelConfiguration = {
          channel: channelInfos,
          configuration: await updateChannelConfig(channelInfos.id, req.body)
        }
        res.status(200).json(result)
        // // Note: if !bot.enabled, we wont try to save hidden fields values, to minimize the risk of error
        // if (req.body.bot?.enabled === false) {
        //   logger.debug('Bot disabled, loading the previous bot conf to not override hidden fields')
        //   const channelOptions =
        //     await getChannelConfigurationOptions(options, channelInfos.id) ??
        //     getDefaultChannelConfigurationOptions(options)
        //   req.body.bot = channelOptions.bot
        //   req.body.bot.enabled = false
        // }
        // // TODO: Same for forbidSpecialChars/noDuplicate: if disabled, don't save reason and tolerance
        // //   (disabling for now, because it is not acceptable to load twice the channel configuration.
        // //   Must find better way)
        // // if (req.body.bot?.enabled === true && req.body.bot.forbidSpecialChars?.enabled === false) {
        // //   logger.debug('Bot disabled, loading the previous bot conf to not override hidden fields')
        // //   const channelOptions =
        // //     await getChannelConfigurationOptions(options, channelInfos.id) ??
        // //     getDefaultChannelConfigurationOptions(options)
        // //   req.body.bot.forbidSpecialChars.reason = channelOptions.bot.forbidSpecialChars.reason
        // //   req.body.bot.forbidSpecialChars.tolerance = channelOptions.bot.forbidSpecialChars.tolerance
        // //   req.body.bot.forbidSpecialChars.applyToModerators = channelOptions.bot.forbidSpecialChars.applyToModerators
        // //   req.body.bot.forbidSpecialChars.enabled = false
        // //    ... NoDuplicate...
        // // }
        // channelOptions = await sanitizeChannelConfigurationOptions(options, req.body, 'validation')
      } catch (err) {
        logger.warn(err.message as string)
        if (err.validationErrorMessage && (typeof err.validationErrorMessage === 'string')) {
          res.status(400)
          res.json({
            validationErrorMessage: err.validationErrorMessage
          })
        } else {
          res.sendStatus(400)
        }
      }

      // logger.debug('Data seems ok, storing them.')
      // const result: ChannelConfiguration = {
      //   channel: channelInfos,
      //   configuration: channelOptions
      // }
      // await storeChannelConfigurationOptions(options, channelInfos.id, channelOptions)
      // res.status(200)
      // res.json(result)
    }
  ]))

  router.get('/configuration/channel/emojis/:channelId', asyncMiddleware([
    checkConfigurationEnabledMiddleware(options),
    getCheckConfigurationChannelMiddleware(options),
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        if (!res.locals.channelInfos) {
          throw new Error('Missing channelInfos in res.locals, should not happen')
        }

        const emojis = Emojis.singleton()
        const channelInfos = res.locals.channelInfos as ChannelInfos

        const channelEmojis =
          (await emojis.channelCustomEmojisDefinition(channelInfos.id)) ??
          emojis.emptyChannelDefinition()

        const result: ChannelEmojisConfiguration = {
          channel: channelInfos,
          emojis: channelEmojis
        }
        res.status(200)
        res.json(result)
      } catch (err) {
        logger.error(err)
        res.sendStatus(500)
      }
    }
  ]))

  router.post('/configuration/channel/emojis/:channelId', asyncMiddleware([
    checkConfigurationEnabledMiddleware(options),
    getCheckConfigurationChannelMiddleware(options),
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        if (!res.locals.channelInfos) {
          throw new Error('Missing channelInfos in res.locals, should not happen')
        }

        const emojis = Emojis.singleton()
        const channelInfos = res.locals.channelInfos as ChannelInfos

        const emojisDefinition = req.body
        let emojisDefinitionSanitized, bufferInfos
        try {
          [emojisDefinitionSanitized, bufferInfos] = await emojis.sanitizeChannelDefinition(
            channelInfos.id,
            emojisDefinition
          )
        } catch (err) {
          logger.warn(err)
          res.sendStatus(400)
          return
        }

        await emojis.saveChannelDefinition(channelInfos.id, emojisDefinitionSanitized, bufferInfos)

        // We must update the emoji only regexp on the Prosody server.
        const customEmojisRegexp = await emojis.getChannelCustomEmojisRegexp(channelInfos.id)
        const roomJIDs = RoomChannel.singleton().getChannelRoomJIDs(channelInfos.id)
        for (const roomJID of roomJIDs) {
          // No need to await here
          logger.info(`Updating room ${roomJID} emoji only regexp...`)
          updateProsodyRoom(options, roomJID, {
            livechat_custom_emoji_regexp: customEmojisRegexp
          }).then(
            () => {},
            (err) => logger.error(err)
          )
        }

        // Reloading data, to send them back to front:
        const channelEmojis =
          (await emojis.channelCustomEmojisDefinition(channelInfos.id)) ??
          emojis.emptyChannelDefinition()
        const result: ChannelEmojisConfiguration = {
          channel: channelInfos,
          emojis: channelEmojis
        }
        res.status(200)
        res.json(result)
      } catch (err) {
        logger.error(err)
        res.sendStatus(500)
      }
    }
  ]))

  router.post('/configuration/channel/emojis/:channelId/enable_emoji_only', asyncMiddleware([
    checkConfigurationEnabledMiddleware(options),
    getCheckConfigurationChannelMiddleware(options),
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        if (!res.locals.channelInfos) {
          throw new Error('Missing channelInfos in res.locals, should not happen')
        }

        const emojis = Emojis.singleton()
        const channelInfos = res.locals.channelInfos as ChannelInfos

        logger.info(`Enabling emoji only mode on each channel ${channelInfos.id} rooms ...`)

        // We can also update the EmojisRegexp, just in case.
        const customEmojisRegexp = await emojis.getChannelCustomEmojisRegexp(channelInfos.id)
        const roomJIDs = RoomChannel.singleton().getChannelRoomJIDs(channelInfos.id)
        for (const roomJID of roomJIDs) {
          // No need to await here
          logger.info(`Enabling emoji only mode on room ${roomJID} ...`)
          updateProsodyRoom(options, roomJID, {
            livechat_emoji_only: true,
            livechat_custom_emoji_regexp: customEmojisRegexp
          }).then(
            () => {},
            (err) => logger.error(err)
          )
        }

        res.status(200)
        res.json({ ok: true })
      } catch (err) {
        logger.error(err)
        res.sendStatus(500)
      }
    }
  ]))
}

export {
  initConfigurationApiRouter
}
