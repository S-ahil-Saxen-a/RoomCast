const APP_ID = "f107c87288a0498a9f27bdd3c57190f5";

// uid : unique id for every user connected
let uid = sessionStorage.getItem("uid");
if (!uid) {
  uid = String(Math.floor(Math.random() * 10000));
  sessionStorage.setItem("uid", uid);
}

let token = null;
let client; // core functionality need user to start stream


let rtmClient; // from rtm SDK
let channel; // sort of room for messaging




// room.html?room=234
const queryString = window.location.search; // return query string of url
const urlParams = new URLSearchParams(queryString); // parse query string

//this automatically catches the roomId form URL and store into roomID
let roomId = urlParams.get("room"); // 234

if (!roomId) {
  roomId = "main";
}

let displayName = sessionStorage.getItem("display_name");
if(!displayName){
  window.location = "lobby.html"
}

let localTracks = []; // local audio and video stream
let remoteUsers = {}; // audio and video stream of every user connected

let localScreenTracks;
let sharingScreen = false;

let joinRoomInit = async () => {
  
  
  rtmClient = await AgoraRTM.createInstance(APP_ID)
  await rtmClient.login({uid, token})

  await rtmClient.addOrUpdateLocalUserAttributes({"name" : displayName}) // adding username of the user in attribute

  channel = await rtmClient.createChannel(roomId)
  await channel.join();

  channel.on("MemberJoined", handleMemberJoined);
  channel.on("MemberLeft", handleMemberLeft);
  channel.on("ChannelMessage", handleChannelMessage);


  // load all channel members
  getMembers();

  addBotMessageToDom(`Welcome to the room ${displayName}! 👋`)
  
  
  // @params
  // mode : optimization algo to be used
  // codec : encoding method used by browser for encoding
  client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
  await client.join(APP_ID, roomId, token, uid);

  client.on("user-published", handleUserPublished);
  client.on("user-left", handleUserLeft);

  // join stream as a another presenter
  // joinStream();
};

let joinStream = async () => {


  document.getElementById("join-btn").style.display = "none"
  document.getElementsByClassName("stream__actions")[0].style.display = "flex"

  localTracks = await AgoraRTC.createMicrophoneAndCameraTracks(); // this function ask user to acess for audio and video

  let player = `<div class="video__container" id="user-container-${uid}">
                        <div class="video-player" id="user-${uid}"></div>
                    </div>`;

  document
    .getElementById("streams__container")
    .insertAdjacentHTML("beforeend", player);

  document
    .getElementById(`user-container-${uid}`)
    .addEventListener("click", expandVideoFrame);

  // audio track @ index 0 and video track @ index 1
  // play method creates video tag for us and takes place to append that tag
  localTracks[1].play(`user-${uid}`);

  // publish all local tracks
  // this client.publish hits "client.on("user-published", handleUserPublished)" this event listner
  // so every connected user hits this and calls handleUserPublished method there
  await client.publish([localTracks[0], localTracks[1]]);
};

let switchToCamera = async () => {
  let player = `<div class="video__container" id="user-container-${uid}">
                        <div class="video-player" id="user-${uid}"></div>
                    </div>`;

  displayFrame.insertAdjacentHTML("beforeend", player); // we added video to the screen-box after ended screen sharing

  // after screen sharing ended, automatically / imediately mutes the camra and audio
  await localTracks[0].setMuted(true);
  await localTracks[1].setMuted(true);

  document.getElementById("mic-btn").classList.remove("active");
  document.getElementById("camera-btn").classList.remove("active");
  document.getElementById("screen-btn").classList.remove("active");

  localTracks[1].play(`user-${uid}`);
  await client.publish([localTracks[1]]);

};

let handleUserPublished = async (user, mediaType) => {
  // mediaType is of two types : audioTrack and videoTrack
  remoteUsers[(user, uid)] = user;

  await client.subscribe(user, mediaType);

  // add new user to the dom
  let player = document.getElementById(`user-container-${user.uid}`);
  // check if user is already present
  if (player === null) {
    player = `<div class="video__container" id="user-container-${user.uid}">
                        <div class="video-player" id="user-${user.uid}"></div>
                    </div>`;

    document
      .getElementById("streams__container")
      .insertAdjacentHTML("beforeend", player);

    document
      .getElementById(`user-container-${user.uid}`)
      .addEventListener("click", expandVideoFrame);
  }

  // new user adjustment of size if another user already on stream__box
  if (displayFrame.style.display) {
    let videoFrame = document.getElementById(`user-container-${user.uid}`);

    videoFrame.style.height = "100px";
    videoFrame.style.width = "100px";
  }

  // after adding user to the dom, now play user's track
  if (mediaType === "video") {
    user.videoTrack.play(`user-${user.uid}`);
  }

  if (mediaType === "audio") {
    user.audioTrack.play();
  }
};

let handleUserLeft = async (user) => {
  delete remoteUsers[user.uid];

  let item = document.getElementById(`user-container-${user.uid}`);

  if(item){
    item.remove();
  }

  // if stream__box user left stream__box hides and all other users resizes its original shape
  if (userIdInDisplayFrame === `user-container-${user.uid}`) {
    displayFrame.style.display = "none";

    let videoFrames = document.getElementsByClassName("video__container");

    // resizing
    for (let i = 0; i < videoFrames; i++) {
      videoFrames[i].style.height = "300px";
      videoFrames[i].style.width = "300px";
    }
  }
};

let toggleMic = async (e) => {
  let button = e.currentTarget;

  if (localTracks[0].muted) {
    await localTracks[0].setMuted(false);
    button.classList.add("active");
  } else {
    await localTracks[0].setMuted(true);
    button.classList.remove("active");
  }
};

let toggleCamera = async (e) => {
  let button = e.currentTarget;

  if (localTracks[1].muted) {
    await localTracks[1].setMuted(false);
    button.classList.add("active");
  } else {
    await localTracks[1].setMuted(true);
    button.classList.remove("active");
  }
};

let toggleScreen = async (e) => {
  let screenButton = e.currentTarget;
  let cameraButton = document.getElementById("camera-btn");

  if (!sharingScreen) {
    sharingScreen = true;

    screenButton.classList.add("active");
    cameraButton.classList.remove("active"); // @ screenPresenting camera active is not showing
    cameraButton.style.display = "none";

    localScreenTracks = await AgoraRTC.createScreenVideoTrack();

    document.getElementById(`user-container-${uid}`).remove();
    displayFrame.style.display = "block";

    let player = `<div class="video__container" id="user-container-${uid}">
                        <div class="video-player" id="user-${uid}"></div>
                    </div>`;

    displayFrame.insertAdjacentHTML("beforeend", player);
    document
      .getElementById(`user-container-${uid}`)
      .addEventListener("click", expandVideoFrame);

    userIdInDisplayFrame = `user-container-${uid}`;
    localScreenTracks.play(`user-${uid}`);

    // unpublish the current video streaming for other users
    await client.unpublish([localTracks[1]]); // only video, screen sharing allows audio ofcourse
    await client.publish([localScreenTracks]); // publish screen sharing for other connected users

    // resizing
    let videoFrames = document.getElementsByClassName("video__container");
    for (let i = 0; i < videoFrames.length; i++) {
      if (videoFrames[i].id !== userIdInDisplayFrame) {
        videoFrames[i].style.width = "100px";
        videoFrames[i].style.height = "100px";
      }
    }
  } else {
    sharingScreen = false;
    cameraButton.style.display = "block";
    document.getElementById(`user-container-${uid}`).remove();
    await client.unpublish([localScreenTracks]); // screen sharing stops

    switchToCamera();
  }
};



let leaveStream = async (e) => {


    e.preventDefault();
    document.getElementById("join-btn").style.display = "block";
    document.getElementsByClassName("stream__actions")[0].style.display = "none";

    for(let i = 0; i < localTracks.length; i++){
        localTracks[i].stop()
        localTracks[i].close()
    }

    await client.unpublish([localTracks[0], localTracks[1]])

    if(localScreenTracks){
        await client.unpublish([localScreenTracks]);
    }

    document.getElementById(`user-container-${uid}`).remove();


    // stream box none if user itself leaves stream
    if(userIdInDisplayFrame === `user-container-${uid}`){
      displayFrame.style.display = "none"

      // resizing all the other streaming users
      for (let i = 0; i < videoFrames.length; i++) {
        videoFrames[i].style.height = "300px";
        videoFrames[i].style.width = "300px";
      }
    }

    channel.sendMessage({text: JSON.stringify({"type": "user_left", "uid": uid})})

}




document.getElementById("mic-btn").addEventListener("click", toggleMic);
document.getElementById("camera-btn").addEventListener("click", toggleCamera);
document.getElementById("screen-btn").addEventListener("click", toggleScreen);

// join stream when join button is clicked
document.getElementById("join-btn").addEventListener("click", joinStream);

// leave stream when leave button is clicked
document.getElementById("leave-btn").addEventListener("click", leaveStream);

// for joining the room
joinRoomInit();
