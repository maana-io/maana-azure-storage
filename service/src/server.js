//
// External imports
//

// load .env into process.env.*
// routing engine
import express from 'express'
// middleware to allow cross-origin requests
import cors from 'cors'

// GraphQL schema compilation
import { makeExecutableSchema } from 'graphql-tools'
// Auth0 Authentication client

// Keep GraphQL stuff nicely factored
import glue from 'schemaglue'
import path from 'path'
import http from 'http'
import fs from 'fs'
import busboy from 'connect-busboy'
// Internal imports
//
import { log, print, initMetrics } from 'io.maana.shared'
import { uploadStreamToBlob } from './azureUpload'
require('dotenv').config()

// const options = {
//   mode: 'js' // default
//   // ignore: '**/somefileyoudonotwant.js'
// }
// const schemaPath = path.join(
//   '.',
//   `${__dirname}`.replace(process.cwd(), ''),
//   'graphql/'
// )
// const glueRes = glue(schemaPath, options)

// // Compile schema
// export const schema = makeExecutableSchema({
//   typeDefs: glueRes.schema,
//   resolvers: glueRes.resolver
// })

const uploadPath = path.join(__dirname, './tmp/') // Register the upload path

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath)
}

//
// Server setup
//
// Our service identity
const SELF = process.env.SERVICE_ID || 'maana-service'

// HTTP port
const PORT = process.env.PORT

// HOSTNAME for subscriptions etc.
const HOSTNAME = process.env.HOSTNAME || 'localhost'

// External DNS name for service
const PUBLICNAME = process.env.PUBLICNAME || 'localhost'

const app = express()
//
// CORS
//
const corsOptions = {
  origin: '*',
  credentials: true // <-- REQUIRED backend setting
}

app.use(cors(corsOptions)) // enable all CORS requests

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.get('Origin') || '*')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE')
  res.header('Access-Control-Expose-Headers', 'Content-Length')
  res.header(
    'Access-Control-Allow-Headers',
    'Accept, Authorization, Content-Type, X-Requested-With, Range'
  )
  if (req.method === 'OPTIONS') {
    return res.send(200)
  } else {
    return next()
  }
})
app.options('*', cors()) // enable pre-flight for all routes

app.get('/', (req, res) => {
  res.send(`${SELF}\n`)
})

app.use(
  busboy({
    highWaterMark: 2 * 1024 * 1024 // Set 2MiB buffer
  })
) // Insert the busboy middle-ware

app.route('/upload').post((req, res, next) => {
  req.pipe(req.busboy) // Pipe it trough busboy

  req.busboy.on('file', async (fieldname, file, filename) => {
    const url = await uploadStreamToBlob(file, filename)
    res.send(url)
  })
})

// const defaultSocketMiddleware = (connectionParams, webSocket) => {
//   return new Promise((resolve, reject) => {
//     log(SELF).warn(
//       'Socket Authentication is disabled. This should not run in production.'
//     )
//     resolve()
//   })
// }

initMetrics(SELF.replace(/[\W_]+/g, ''))

const initServer = options => {
  //   let { httpAuthMiddleware, socketAuthMiddleware } = options

  //   let socketMiddleware = socketAuthMiddleware || defaultSocketMiddleware

  //   const server = new ApolloServer({
  //     schema,
  //     subscriptions: {
  //       onConnect: socketMiddleware
  //     }
  //   })

  //   server.applyMiddleware({
  //     app
  //   })

  const httpServer = http.createServer(app)

  // server.installSubscriptionHandlers(httpServer)

  httpServer.listen({ port: PORT }, () => {
    log(SELF).info(
      `listening on ${print.external(`http://${HOSTNAME}:${PORT}`)}`
    )
  })

  httpServer.timeout = 10 * 60 * 1000
}

export default initServer
