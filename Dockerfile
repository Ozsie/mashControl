FROM hypriot/rpi-node
MAINTAINER Oscar Djupfeldt

USER root

RUN git clone https://github.com/ozsie/mashControl.git
WORKDIR mashControl

COPY node_modules ./node_modules
RUN ls -l ./

CMD npm run start-docker