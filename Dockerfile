FROM node:latest
RUN mkdir -p /run
WORKDIR /run

ENV DISPLAY :9.0

RUN apt-get update && \
	apt-get install -y \
	gconf-service \
	libasound2 \
	libatk1.0-0 \
	libatk-bridge2.0-0 \
	libc6 \
	libcairo2 \
	libcups2 \
	libdbus-1-3 \
	libexpat1 \
	libfontconfig1 \
	libgcc1 \
	libgconf-2-4 \
	libgdk-pixbuf2.0-0 \
	libglib2.0-0 \
	libgtk-3-0 \
	libnspr4 \
	libpango-1.0-0 \
	libpangocairo-1.0-0 \
	libstdc++6 \
	libx11-6 \
	libx11-xcb1 \
	libxcb1 \
	libxcomposite1 \
	libxcursor1 \
	libxdamage1 \
	libxext6 \
	libxfixes3 \
	libxi6 \
	libxrandr2 \
	libxrender1 \
	libxss1 \
	libxtst6 \
	ca-certificates \
	fonts-liberation \
	libappindicator1 \
	libnss3 \
	lsb-release \
	xdg-utils \
	wget \
	libgtkextra-dev \
	libxtst-dev \
	xvfb \
	&& rm -rf /var/lib/apt/lists/*

# Install app dependencies
COPY package.json /run/package.json
RUN npm install

WORKDIR /run/node_modules/puppeteer/.local-chromium/linux-800071/chrome-linux/
RUN chown root:root chrome_sandbox
RUN chmod 4777 chrome_sandbox
RUN cp -p chrome_sandbox /usr/local/sbin/chrome-devel-sandbox
RUN export CHROME_DEVEL_SANDBOX=/usr/local/sbin/chrome-devel-sandbox
WORKDIR /run

# Bundle app source
COPY . .
RUN chmod +x ./docker.sh

EXPOSE 8084
CMD [ "./docker.sh" ]
