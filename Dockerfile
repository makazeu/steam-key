FROM node:8.4.0

RUN npm install -g pm2
RUN mkdir /app
WORKDIR /app

ENV STKEY_ID test
ENV STKEY_NAME 本地测试
ENV STKEY_LOG_ENABLED false
ENV STKEY_POST_ADDRESS http://your post address
ENV STKEY_SERVER_BY your name

ADD package*.json ./
RUN npm install
ADD . ./

EXPOSE 3999
CMD echo "{\
    \"id\":   \"$STKEY_ID\",\
    \"name\": \"$STKEY_NAME\",\
    \"log_enabled\": $STKEY_LOG_ENABLED,\
    \"post_address\": \"$STKEY_POST_ADDRESS\",\
    \"serverBy\": \"$STKEY_SERVER_BY\"\
}" > /app/serverconfig.json && pm2-docker server.js
