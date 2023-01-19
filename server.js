import EventEmitter from 'events'
import http from 'http'
import { Server } from "socket.io"
import express from "express"
const app = express()
const server = http.createServer(app)
const io = new Server(server)
const ipcLocal = new EventEmitter()
let connections = []
var projectorState = {}
const projectors = [
	[ '10.208.79.66', 'T9' ],
	[ '10.208.79.48', 'T2' ],
	[ '10.208.79.50', 'T1' ]
]

app.use(express.static('./'))
app.use(express.static('./build/bundle.js'))
app.get('./', function (req, res) {
	res('./index.html')
})

server.listen(3000, () => {
	console.log('Barco control webApp listening on port 3000')
	import('./devices/projector.js')
})


io.on('connection', (socket) => {
	connections.push(socket)
	socket.emit('projectors', projectors)
	console.log(`server: number of client connections = ${connections.length}`)
	
	if (projectorState.online === true) {
		console.log('new connection, send page update...');
		updatePage(projectorState)
	}

	socket.on('projector socket', (msg) => {
		console.log(`message from projector socket: ${msg}`)
	})

	socket.on('page loaded', () => {
		if (projectorState.online === true) {
			updatePage(projectorState)
		}
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
	})
})

export { ipcLocal, io }