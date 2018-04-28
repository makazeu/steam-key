FROM node:latest

RUN npm install -g pm2
RUN mkdir /app
WORKDIR /app

ENV STKEY_ID test
ENV STKEY_NAME 本地测试
ENV STKEY_SERVER_BY your name

ADD package*.json ./
RUN npm install
ADD . ./

EXPOSE 3999
CMD echo "{\
    \"id\":   \"$STKEY_ID\",\
    \"name\": \"$STKEY_NAME\",\
    \"serverBy\": \"$STKEY_SERVER_BY\"\
}" > /app/config.json && pm2-docker server.js
