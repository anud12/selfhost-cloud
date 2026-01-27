# Use Alpine as base
FROM alpine:3.20


# Set arguments for user
ARG USERNAME=user
ARG UID=1000

# Install dependencies
RUN apk add --no-cache \
    git \
    curl \
    bash \
    ca-certificates \
    && adduser -D -u ${UID} ${USERNAME}

# Install nodejs
RUN apk add --no-cache \
    nodejs 

# Install Helm
RUN curl -fsSL https://get.helm.sh/helm-v3.12.1-linux-amd64.tar.gz -o helm.tar.gz \
    && tar -zxvf helm.tar.gz \
    && mv linux-amd64/helm /usr/local/bin/helm \
    && chmod +x /usr/local/bin/helm \
    && rm -rf linux-amd64 helm.tar.gz

# Copy entrypoint script
COPY entrypoint.sh /home/${USERNAME}/entrypoint.sh
RUN chmod +x /home/${USERNAME}/entrypoint.sh

# Copy app script
COPY app.js /home/${USERNAME}/app.js

# Switch to the non-root user
USER ${USERNAME}
WORKDIR /home/${USERNAME}


# Run entrypoint
ENTRYPOINT ["/home/user/entrypoint.sh"]
