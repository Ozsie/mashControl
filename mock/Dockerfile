FROM hypriot/rpi-node
MAINTAINER Oscar Djupfeldt

USER root

WORKDIR mock
COPY mock.js mock.js
COPY package.json package.json
COPY logs logs

CMD node mock.js