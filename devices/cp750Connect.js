const net = require('net');
const port = 61408;
const host = '10.208.79.33';
const StringDecoder = require('string_decoder').StringDecoder
const dolbyData = new StringDecoder('utf8')

const client = net.createConnection({
  port: port,
  host: host
}, () => {
  console.log('connected to cp750')
})

client.on('data', (data) => {
  console.log(dolbyData.write(data))
})
	
client.on('end', () => {
  console.log('disconnected')
})

client.on('close', () => {
  console.log('closed')
})


client.on('error', (err) => {
  console.log('error')
  console.log(err)
})

setTimeout(() => {
 client.write(Buffer.from('status\n'))
}, 5000)

setTimeout(() => {
  client.write(Buffer.from('exit\n'))
}, 20000)

