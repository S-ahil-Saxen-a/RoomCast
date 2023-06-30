// ************ Member Joined Functionality ************
let handleMemberJoined = async (memberId) => {
  console.log("a new member has joined the room : ", memberId);

  addMemberToDom(memberId);

  // for updating total users if new user joined
  let members = await channel.getMembers();
  updateMemberTotal(members);

  let { name } = await rtmClient.getUserAttributesByKeys(memberId, ["name"]); // get name of user of memberId
  addBotMessageToDom(`Welcome to the room ${name}! 👋`);
};

let addMemberToDom = async (memberId) => {
  let { name } = await rtmClient.getUserAttributesByKeys(memberId, ["name"]); // get name of user of memberId

  let membersWrapper = document.getElementById("member__list");

  let memberItem = `<div class="member__wrapper" id="member__${memberId}__wrapper">
                        <span class="green__icon"></span>
                        <p class="member_name">${name}</p>
                    </div>`;

  membersWrapper.insertAdjacentHTML("beforeend", memberItem);
};

// ******* update total member *********
let updateMemberTotal = async (members) => {
  let total = document.getElementById("members__count");
  total.innerText = members.length;
};

// ********* Member Left Functionality ***************
let handleMemberLeft = async (memberId) => {
  removeMemberFromDom(memberId);

  // for updating total users if any user left
  let members = await channel.getMembers();
  updateMemberTotal(members);
};

let removeMemberFromDom = async (memberId) => {
  let memberWrapper = document.getElementById(`member__${memberId}__wrapper`);
  
    // storing name of user left for bot message
    let name = memberWrapper.getElementsByClassName("member_name")[0].textContent

  memberWrapper.remove();

  addBotMessageToDom(`${name} has left the room`);


};

let leaveChannel = async () => {
  // this trigger MemberLeft event
  await channel.leave();
  await rtmClient.logout();
};

window.addEventListener("beforeunload", leaveChannel);

// adding all the connected users to the members list
let getMembers = async () => {
  let members = await channel.getMembers(); // returns array of users ids

  updateMemberTotal(members);

  for (let i = 0; i < members.length; i++) {
    addMemberToDom(members[i]);
  }
};

// ********** Messaging Functionality ***********

let handleChannelMessage = async (messageData, memberId) => {

    console.log("a new msg was received")
    let data = JSON.parse(messageData.text)
    console.log("a new msg was received after parsing", data)

    if(data.type === "chat"){
        addMessageToDom(data.displayName, data.message)
    }

    if(data.type === "user_left"){
      document.getElementById(`user-container-${data.uid}`).remove();

      // stream box none if user itself leaves stream
      if (userIdInDisplayFrame === `user-container-${uid}`) {
        displayFrame.style.display = "none";

        // resizing all the other streaming users
        for (let i = 0; i < videoFrames.length; i++) {
          videoFrames[i].style.height = "300px";
          videoFrames[i].style.width = "300px";
        }
      }
    }
}

let sendMessage = async (e) => {
  e.preventDefault();

  let message = e.target.message.value;
  channel.sendMessage({
    text: JSON.stringify({
      type: "chat",
      message: message,
      displayName: displayName,
    }),
  });

  addMessageToDom(displayName, message);

  e.target.reset(); // clears form after sending
};

let messageForm = document.getElementById("message__form");
messageForm.addEventListener("submit", sendMessage)



let addMessageToDom = (name, message) => {
    let messagesWrapper = document.getElementById("messages");

    let newMessage = `<div class="message__wrapper">
                        <div class="message__body">
                            <strong class="message__author">${name}</strong>
                            <p class="message__text">${message}</p>
                        </div>
                    </div>`;
    
    messagesWrapper.insertAdjacentHTML("beforeend", newMessage)

    // scroller automatically scrolls to the last message
    let lastMessage = document.querySelector("#messages .message__wrapper:last-child")

    if(lastMessage){
        lastMessage.scrollIntoView();
    }

}


let addBotMessageToDom = (botMessage) => {
    let messagesWrapper = document.getElementById("messages");

    let newMessage = `<div class="message__wrapper">
                        <div class="message__body__bot">
                            <strong class="message__author__bot">🤖 OP Bot</strong>
                            <p class="message__text__bot">${botMessage}</p>
                        </div>
                    </div>`;
    
    messagesWrapper.insertAdjacentHTML("beforeend", newMessage)

    // scroller automatically scrolls to the last message
    let lastMessage = document.querySelector("#messages .message__wrapper:last-child")

    if(lastMessage){
        lastMessage.scrollIntoView();
    }

}

