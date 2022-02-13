FROM node:17-stretch


WORKDIR /app

COPY package*.json ./

#RUN apt-get -y install python3
#RUN apk add --no-cache python3 py3-pip make g++
RUN npm install

COPY . .

ENV PORT=8000

EXPOSE 8000

CMD [ "npm", "start" ]