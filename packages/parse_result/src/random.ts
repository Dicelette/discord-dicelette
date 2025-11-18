/**
 * Generate a random engine using node's crypto module
 */

import { getEngine } from "@dicelette/core";
import {Random} from "random-js";

export const random = new Random(getEngine("nodeCrypto"));
