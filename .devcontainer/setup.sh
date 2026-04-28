#!/bin/bash
set -e
# Fisher
fisher install jorgebucaran/nvm.fish

# Clone du repo core
git clone git@github.com:dicelette/core.git
cd core
bun install
bun run build
pnpm link --global
cd ..
cd $(basename $(pwd))
pnpm link --global @dicelette/core

# Install dep
pnpm i

# Create .env from env variable

cat <<EOF > $ENV_FILE
DISCORD_TOKEN=${DISCORD_TOKEN}
CLIENT_ID=${CLIENT_ID}
OWNER_ID=${OWNER_ID}
PRIVATE_ID=${PRIVATE_ID}
CLIENT_SECRET=${CLIENT_SECRET}
DISCORD_EMOJI_ID=${DISCORD_EMOJI_ID}
GITHUB_EMOJI_ID=${_GITHUB_EMOJI_ID}
KOFI_EMOJI_ID=${KOFI_EMOJI_ID}
MATH_EMOJI_ID=${MATH_EMOJI_ID}
NODE_ENV=${NODE_ENV}
DASHBOARD_ENABLED=${DASHBOARD_ENABLED}
FRONTEND_URL=${FRONTEND_URL}
DISCORD_REDIRECT_URI=${DISCORD_REDIRECT_URI}
EOF
