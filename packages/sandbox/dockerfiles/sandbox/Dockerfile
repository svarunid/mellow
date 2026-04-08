FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# ─── Base system packages ────────────────────────────────────────────────────
# Combined into a single apt layer (Python, C/C++ toolchain included)
# to avoid repeated apt-get update overhead.
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Core utilities
    curl wget git ca-certificates gnupg unzip zip tar xz-utils \
    # Build tools (required by many language toolchains)
    build-essential cmake make ninja-build pkg-config \
    # Dependency headers (native extensions for Python, Ruby, etc.)
    libssl-dev libreadline-dev zlib1g-dev libyaml-dev libffi-dev \
    libsqlite3-dev libgdbm-dev libncurses5-dev libbz2-dev \
    # C/C++ toolchain
    clang clang-format llvm lldb \
    # Python
    python3 python3-pip python3-venv python3-dev \
    # Editors & search
    vim nano ripgrep fzf jq fd-find \
    # Network & process tools
    openssh-client procps htop sudo \
    # Misc
    lsb-release software-properties-common python-is-python3 \
    && rm -rf /var/lib/apt/lists/*

# ─── Developer user (passwordless sudo for on-demand installs) ───────────────
RUN useradd -m -s /bin/bash developer \
    && echo "developer ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# ════════════════════════════════════════════════════════════════════════════
# Python — uv replaces pip/pipx/pyenv/conda for version & env management
# https://docs.astral.sh/uv | https://python-poetry.org
# ════════════════════════════════════════════════════════════════════════════

# uv — fast Python package, project & version manager
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

# poetry — dependency & packaging manager (needed by existing projects)
RUN curl -sSL https://install.python-poetry.org | python3 -

# ruff — Python linter & formatter
RUN uv tool install ruff

# ════════════════════════════════════════════════════════════════════════════
# Node.js + package managers + Bun
# ════════════════════════════════════════════════════════════════════════════

# Node.js 22 LTS — via NodeSource
# https://github.com/nodesource/distributions
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# corepack — manages yarn & pnpm versions
RUN corepack enable \
    && corepack prepare yarn@stable --activate \
    && corepack prepare pnpm@latest --activate

# Bun — JS/TS runtime, bundler & package manager
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# JS/TS tooling (compiler + formatter/linter)
RUN npm install -g typescript @biomejs/biome \
    && npm cache clean --force

# ════════════════════════════════════════════════════════════════════════════
# Go
# Official: https://go.dev/doc/install
# ════════════════════════════════════════════════════════════════════════════
ARG GO_VERSION=1.23.5
RUN ARCH=$(dpkg --print-architecture) \
    && curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-${ARCH}.tar.gz" \
       | tar -C /usr/local -xz
ENV PATH="/usr/local/go/bin:$PATH"
ENV GOPATH="/root/go"
ENV PATH="$GOPATH/bin:$PATH"

# Go formatters & linters — clean build cache after compilation
RUN go install golang.org/x/tools/cmd/goimports@latest \
    && go install honnef.co/go/tools/cmd/staticcheck@latest \
    && go clean -cache -modcache

# ════════════════════════════════════════════════════════════════════════════
# Rust
# Official: https://www.rust-lang.org/tools/install (rustup)
# ════════════════════════════════════════════════════════════════════════════
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
    | sh -s -- -y --default-toolchain stable --profile minimal
ENV PATH="/root/.cargo/bin:$PATH"

# Rust formatters & linters
RUN rustup component add rustfmt clippy

# cargo-binstall — fast binary installer for cargo tools
RUN curl -L --proto '=https' --tlsv1.2 -sSf \
    https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/install-from-binstall-release.sh \
    | bash \
    && rm -rf /root/.cargo/registry

# ─── On-demand runtime installer ─────────────────────────────────────────────
COPY install-runtime /usr/local/bin/install-runtime
RUN chmod +x /usr/local/bin/install-runtime

# ─── Workspace ───────────────────────────────────────────────────────────────
WORKDIR /workspace
RUN chown developer:developer /workspace

USER developer

CMD ["/bin/bash"]
