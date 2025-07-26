#!/bin/bash
cd "$(dirname "$0")"
cd ../../..
bun run packages/cli/src/commands/setup.ts