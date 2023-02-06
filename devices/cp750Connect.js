import net from 'node:net'
const port = 61408
const host = '10.208.79.33'


const cp750 = net.createConnection({
  port: port,
  host: host
}, () => {
  console.log('connected to cp750')
})

export default cp750