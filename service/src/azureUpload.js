import azure from 'azure-storage'
import fs from 'fs'
import streamBuffers from 'stream-buffers'
const blobService = azure.createBlobService()
const containerName = 'maana-azure-storage-wrapper'

const {
  Aborter,
  BlockBlobURL,
  ContainerURL,
  ServiceURL,
  SharedKeyCredential,
  StorageURL,
  uploadStreamToBlockBlob,
  uploadFileToBlockBlob
} = require('@azure/storage-blob')

const credentials = new SharedKeyCredential(
  process.env.AZURE_STORAGE_ACCOUNT,
  process.env.AZURE_STORAGE_ACCESS_KEY
)
const pipeline = StorageURL.newPipeline(credentials)
const serviceURL = new ServiceURL(
  `https://${process.env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net`,
  pipeline
)
const containerURL = ContainerURL.fromServiceURL(serviceURL, containerName)

export const uploadStreamToBlob = (fileStream, blobName) => {
  return new Promise((resolve, reject) => {
    const stream = fileStream.pipe(
    blobService.createWriteStreamToBlockBlob(containerName, blobName, {
      blockIdPrefix: 'block'
    })
  )

    stream.on('data', data => {
      process.stdout.write('.')
    })

    stream.on('error', err => {      
      console.log('error', err)
      reject(err)
    })

    stream.on('finish', () => {    
      blobService.getBlobProperties(containerName, blobName, (err, result) => {
        const blockBlobURL = BlockBlobURL.fromContainerURL(
          containerURL,
          result.name
        )
        if (err){
          reject(err)
        }        
        resolve(blockBlobURL.url)
      })
    })
  })
}

export const uploadToAzure = (req, res, next) => {
  if (!req.file) {
    return next()
  }
  const blobName = req.file.originalname

  let fileStream = new streamBuffers.ReadableStreamBuffer({
    frequency: 10, // in milliseconds.
    chunkSize: 2048 // in bytes.
  })

  // With a buffer
  fileStream.put(req.file.buffer)
  fileStream.stop()

  const stream = fileStream.pipe(
    blobService.createWriteStreamToBlockBlob(containerName, blobName, {
      blockIdPrefix: 'block'
    })
  )

  stream.on('data', data => {
    process.stdout.write('.')
  })

  stream.on('error', err => {
    req.file.cloudStorageError = err
    console.log('error', err)
    next(err)
  })

  stream.on('finish', () => {
    req.file.cloudStorageObject = blobName    
    blobService.getBlobProperties(containerName, blobName, (err, result) => {
      const blockBlobURL = BlockBlobURL.fromContainerURL(
        containerURL,
        result.name
      )
      req.file.blobUrl = blockBlobURL.url
      next()
    })
  })
}
