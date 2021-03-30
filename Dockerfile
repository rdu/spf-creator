FROM node:alpine

WORKDIR /src

RUN npm install ts-node -g

COPY . /src
RUN npm install

ENTRYPOINT [ "ts-node" ]
CMD ["index.ts"]