import net from 'node:net'
import { io } from '../server.js'
import { ipcLocal } from '../server.js'
let chunk = []
let muteRegex = /(mute)\ ([0-1])/
let inputRegex = /(input_mode)\ ([\w]{1,8})/
let faderRegex = /(fader)\ ([0-9]{1,2})/
let remoteIP = ''
let deviceState = {}
let cp750 = {}

console.log('cp750 module running');

ipcLocal.on('init projector', (msg) => {
    console.log(`cp750 module: init projector, host address: ${msg.host}`);
    if (msg.host === '10.208.79.50') {
        remoteIP = '10.208.79.33'
    }
    if (msg.host === '10.208.79.48') {
        remoteIP = '10.208.79.141'
    }

    console.log(`cp750 module: remoteIP = ${remoteIP}`);


    cp750 = net.connect({
        host: remoteIP,
        port: 61408
    }, () => {
        console.log('CP750 connect');
    })

    cp750.on('connect', () => {
        console.log('cp750 connected....')
        getStates()
    })

    cp750.on('data', (data) => {
        chunk.push(data)
    })

    cp750.on('end', () => {
        console.log('cp750 disconnected')
    })

    cp750.on('close', () => {
        console.log('cp750 closed')
    })

    cp750.on('error', (err) => {
        console.log('error')
        console.log(err)
    })
})

export { cp750 }

function asciiToString(arr) {
    let line = ''
    var len = arr.length;
    for (let i = 0; i < len; i++) {
        if (arr[i] !== 0x0a) {
            line += arr[i].toString()
        }
    }
    let muteState = muteRegex.exec(line)
    let faderValue = faderRegex.exec(line)
    let inputMode = inputRegex.exec(line)
    // if (muteState[2]) {
    //     console.log(`cp750 status....max rules!
    //                 mute: ${muteState[2]}
    //                 fader: ${faderValue[2]}
    //                 input: ${inputMode[2]}`)
    // }
    
    io.sockets.emit('cp750 mute', {
        mute: muteState[2]
    })
    io.sockets.emit('cp750 input', {
        input: inputMode[2]
    })
    io.sockets.emit('cp750 fader', {
        fader: Number(faderValue[2])
    })
    io.sockets.emit('swift mute', muteState[2])
    io.sockets.emit('swift fader', faderValue[2])
    io.sockets.emit('swift input', inputMode[2])
    chunk = []
}

io.on('connection', (socket) => {
    console.log('cp750 module: io sockets')
    socket.on('dolby command', (msg) => {
        switch (msg.setting) {
            case 'mute':
                console.log(msg)
                if (msg.state === '0') {
                    cp750.write(Buffer.from('cp750.sys.mute 1\n'))
                }
                if (msg.state === '1') {
                    cp750.write(Buffer.from('cp750.sys.mute 0\n'))
                }
                getStates()
                break;
            case 'input':
                console.log('input change')
                console.log(msg)
                cp750.write(Buffer.from(`cp750.sys.input_mode ${msg.state}\n`))
                getStates()
                break;
            case 'fader':
                console.log('levels change')
                console.log(msg)
                cp750.write(Buffer.from(`cp750.sys.fader ${msg.state}\n`))
                getStates()
                break;
            default:
                console.log('dolby command parse error')
                break;
        }
    })
})


function getStates(setting) {
    cp750.write(Buffer.from('cp750.sys.mute ?\n'))
    cp750.write(Buffer.from('cp750.sys.input_mode ?\n'))
    cp750.write(Buffer.from('cp750.sys.fader ?\n'))

    setTimeout(() => {
        asciiToString(chunk)
        chunk = []
    }, 100)
}