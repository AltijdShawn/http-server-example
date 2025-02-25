import axiosMin from "/static?page=/js/lib/axios.min.js";

setInterval(() => {
  axiosMin({
    url: '/socket/polling'
  }).then(resp => {
    console.log(resp)
  })
}, 500)