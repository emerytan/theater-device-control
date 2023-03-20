import EventEmitter from 'events'
import http from 'http'
import { Server } from "socket.io"
import express from "express"
const app = express()
const server = http.createServer(app)
const io = new Server(server)
const ipcLocal = new EventEmitter()
let connections = []
var projectorState = {
	online: false
}
const projectors = [
	[ '10.208.79.66', 'T9' ],
	[ '10.208.79.48', 'T2' ],
	[ '10.208.79.50', 'T1' ]
]

// web server startup
app.use(express.static('./'))
app.use(express.static('./build/bundle.js'))
app.get('./', function (req, res) {
	res('./index.html')
})

server.listen(3000, () => {
	console.log('Barco control webApp listening on port 3000')
	import('./devices/projector.js')
	import('./devices/cp750.js')
})

// sockets 
io.on('connection', (socket) => {
	console.log(`server: new socket connection ${socket.handshake.address}`)
	connections.push(socket)
	socket.emit('projectors', projectors)
	socket.emit('hi swift')
	console.log(`server: number of client connections = ${connections.length}`)
	

	socket.on('page loaded', (msg) => {
		console.log('server: page loaded message')
		console.log(msg.deviceState)
		projectorState.online = msg.deviceState
	})

	socket.on('swift test', (data) => {
		console.log(data)
	})

	socket.on('projector connect', (msg) => {
		console.log("server: projector connection request")
		console.log(msg)
		ipcLocal.emit('init projector', {
			host: msg.ip,
			port: 43728,
			theater: msg.theater
		})
	})

	socket.on('disconnect', function (socket) {
		connections.splice(connections.indexOf(socket), 1)
		console.log(`server: number of client connections = ${connections.length}`)
		if (connections.length === 0 && projectorState.online === true) {
			ipcLocal.emit('devices disconnect')
		}
	})
})

// interprocess comms
ipcLocal.on('server update', (msg) => {
	console.log('server: ipcLocal')
	console.log(msg)
	projectorState.online = msg
})

export { ipcLocal, io }
