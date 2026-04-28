#!/bin/bash
set -e
# pnpm setup
pnpm setup
pnpm completion fish > ~/.config/fish/completions/pnpm.fish


# Clone du repo core
cd ..
gh repo clone Dicelette/core
cd core
bun install
bun run build
pnpm link --global
cd ../discord-dicelette
pnpm link ../core
pnpm i

# Create .env from env variable

echo DISCORD_TOKEN=$DISCORD_TOKEN > .env
echo CLIENT_ID=$CLIENT_ID >> .env
echo OWNER_ID=$OWNER_ID >> .env
echo PRIVATE_ID=$PRIVATE_ID >> .env
echo CLIENT_SECRET=$CLIENT_SECRET >> .env
echo DISCORD_EMOJI_ID=$DISCORD_EMOJI_ID >> .env
echo GITHUB_EMOJI_ID=$_GITHUB_EMOJI_ID >> .env
echo KOFI_EMOJI_ID=$KOFI_EMOJI_ID >> .env
echo MATH_EMOJI_ID=$MATH_EMOJI_ID >> .env
echo NODE_ENV=$NODE_ENV >> .env
echo DASHBOARD_ENABLED=$DASHBOARD_ENABLED >> .env
echo FRONTEND_URL=$FRONTEND_URL >> .env
echo DISCORD_REDIRECT_URI=$DISCORD_REDIRECT_URI >> .env

