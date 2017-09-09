FROM hypriot/rpi-node
MAINTAINER Oscar Djupfeldt

USER root

WORKDIR mock
COPY src src
COPY package.json package.json
COPY logs logs

CMD node src/mock.js