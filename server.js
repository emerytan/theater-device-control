import EventEmitter from 'events'
import http from 'http'
import { Server } from "socket.io"
import express from "express"
const app = express()
const server = http.createServer(app)
const io = new Server(server)
const ipcLocal = new EventEmitter()


let connections = []
let projectorState = {}
const projectors = [
	'10.208.79.66',
	'10.208.79.48',
	'10.208.79.50'
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
			port: 43728
		})
	})

	socket.on('projector disconnect', (msg) => {
		console.log(`server module projector disconnect socket
		last connected: ${msg.lastConnected}
		action: ${msg.action}`)
		ipcLocal.emit('disconnect projector', msg)
	})
	
	
	ipcLocal.on('server update', () => {
		console.log('server update listener');
	})

	ipcLocal.on('projector connected', (msg) => {
		projectorState.host = msg.host
		projectorState.online = msg.online
	})
	
    ipcLocal.on('update', (msg) => {
		console.log('server update');
        projectorState = msg
    })
	
	ipcLocal.on('projector disconnected', (msg) => {
		console.log('server: ipcLocal projector is disconnected, sending sockets');
		projectorState.online = msg.online
		projectorState.host = msg.host
		io.sockets.emit('projector connection', {
			ip: msg.host,
			online: msg.online
		})
	})


	function updatePage(state) {
		socket.emit('lamp', state.lamp)
		socket.emit('dowser', state.shutter)
		socket.emit('macros', {
			list: state.macros,
			selected: state.macroIndex
		})
		socket.emit('last macro', state.lastMacro)
		socket.emit('projector connection', {
			ip: state.host,
			online: state.online
		})
	}

	
	// socket.on('lens command', (data) => {
	// 	console.log(data)

	// 	switch (data.action) {
	// 		case 'power':
	// 			console.log(`send power value: ${data.command}`)
	// 			if (data.command === '0') { // power is on
	// 				console.log('lamp power is on - send off command');
	// 				io.sockets.emit('power', 1)
	// 			} else if (data.command === '1') {
	// 				console.log('lamp power is off - send on command');
	// 				io.sockets.emit('power', 0)
	// 			}
	// 			break;
	// 		case 'dowser':
	// 			console.log(`send dowser value: ${data.command}`)
	// 			if (data.command === '0') { // power is on
	// 				console.log('dowser power is on - send off command');
	// 				io.sockets.emit('dowser', 1)
	// 			} else if (data.command === '1') {
	// 				console.log('dowser power is off - send on command');
	// 				io.sockets.emit('dowser', 0)
	// 			}
	// 			break;
	// 		case 'focus':
	// 			console.log(`send focus value: ${data.command}`)
	// 			break;
	// 		case 'zoom':
	// 			console.log(`send zoom value: ${data.command}`)
	// 			break;
	// 		case 'shift':
	// 			console.log(`send shift value: ${data.command}`)
	// 			break;
	// 		default:
	// 			console.log('projector command not recognized');
	// 			break;
	// 	}
	// })

	socket.on('disconnect', function (socket) {
		connections.splice(connections.indexOf(socket), 1)
		console.log(`server: number of client connections = ${connections.length}`)
	})
})




export { ipcLocal, io }