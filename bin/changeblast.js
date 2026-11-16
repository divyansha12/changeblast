#!/usr/bin/env node

import { createCLI } from '../src/cli/commands.js';

const program = createCLI();
program.parse(process.argv);
