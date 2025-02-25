// import axiosMin from "/static?page=/js/lib/axios.min.js";

// let fetched = []
// let executedIds = []
// let listeners = []

// setInterval(() => {
//   const now = Date.now()
//   axiosMin({
//     url: '/sockets/polling'
//   }).then(resp => {
//     console.log(`Response latency is:`, (Date.now() - now), 'ms.')
//     fetched = (resp.data.items)
//   })

//   for (const l of listeners) {
//     for (const f of fetched) {
//       if (!executedIds.includes(f.id)) {
//         if (l.listener == f.item.key) {
//           l.cb(f.item.data)
//           executedIds.push(f.id)
//         }
//       }
//     }
//   }
// }, 500)

// setInterval(() => {executedIds = []},12000)

// export const socket = {
//   on: (listener, cb) => {
//     listeners.push({listener, cb})
//   }
// }

// socket.on('test_ping', (data) => {
//   // console.log(data)
//   const now = Date.now();
//   const whenSend = data.timeStamp

//   console.log('Web socket Latency is:', (now - whenSend), 'ms.')
// })