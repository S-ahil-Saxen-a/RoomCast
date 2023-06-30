let form = document.getElementById("lobby__form");

// autofill functionality of username, by extracting username from sessionStorage
let display_name = sessionStorage.getItem("display_name");
if(display_name){
    form.name.value = display_name;
}

form.addEventListener("submit", (e) => {
    e.preventDefault();

    sessionStorage.setItem("display_name", e.target.name.value); // saved username into sessionStorage

    let inviteCode = e.target.room.value
    if(!inviteCode){
        inviteCode = String(Math.floor(Math.random() * 10000))
    }
    window.location = `room.html?room=${inviteCode}`
})