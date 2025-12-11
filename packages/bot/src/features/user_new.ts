import {
fetchAvatarUrl,
fetchChannel,
getInteractionContext as getLangAndConfig,
addAutoRole,
pingModeratorRole,
reuploadAvatar,
} from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { isNumber, type StatisticalTemplate } from "@dicelette/core";
import { findln } from "@dicelette/localization";
import { parseEmbedFields } from "@dicelette/parse_result";
import type {
Characters,
DiscordChannel,
PersonnageIds,
Settings,
Translation,
UserData,
} from "@dicelette/types";
import {
allValueUndefOrEmptyString,
cleanAvatarUrl,
logger,
NoChannel,
NoEmbed,
profiler,
QUERY_URL_PATTERNS,
verifyAvatarUrl,
} from "@dicelette/utils";
import { getTemplateByInteraction } from "database";
import type { GuildBasedChannel } from "discord.js";
import * as Djs from "discord.js";
import { MacroFeature, StatsFeature } from "features";
import * as Messages from "messages";
import { continueCancelButtons, selfRegisterAllowance } from "utils";
import { BaseFeature, type FeatureContext } from "./base";

/**
 * User feature class - handles user registration and management
 * Uses instance properties to store context and reduce parameter passing
 */
export class UserFeature extends BaseFeature {
constructor(context: FeatureContext) {
super(context);
}

// Methods will be added here from the source files
