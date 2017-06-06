FROM hypriot/rpi-node
MAINTAINER Oscar Djupfeldt

USER root

WORKDIR mashControl

COPY . .
RUN ls -l ./

CMD npm run start-docker