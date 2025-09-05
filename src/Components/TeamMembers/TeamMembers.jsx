import React, { useEffect, useState } from "react";
import HeaderTab from "../../Components/HeaderTab/HeaderTab";
import styles from "../TeamMembers/TeamMembers.module.css";
import Modal from "../Modal/Modal";
import axios from "axios";
import URL from "../../config/api";
import { useLocation, useNavigate } from "react-router-dom";
import Loader from "../Loader/Loader";
import { url2 } from "../../config/url";
// getDashboardStats
const TeamMembers = () => {
  const [loading, setIsloading] = useState(false);
  const location = useLocation();
  let a = localStorage.getItem("visible");
  let b = localStorage.getItem("remaining");
  const visibleIds = location.state?.visible || a;
  const remainingIds = location.state?.remaining || b;
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [userComments, setUserComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const customerInfo = JSON.parse(localStorage.getItem("customerInfo"));
  const selectedProject = JSON.parse(localStorage.getItem("selectedProject"));
  const messagesEndRef = React.useRef(null);
  const [visibleUserComments, setVisibleUserComments] = useState([]);
  const [commentLoading, setCommentLoading] = useState(false);

  const message = location.state?.message;
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchCommentsForUser = async (userId) => {
    try {
      const { data } = await axios.get(
        `${URL}/projects/${selectedProject.id}/user-comments/${userId}`
      );
      setUserComments(data);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error("Error fetching user comments", err);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;

    const tempComment = {
      comment: commentText,
      createdByType: "customer",
      createdAt: new Date().toISOString(),
    };
    setUserComments((prev) => [tempComment, ...prev]);
    setCommentText("");

    try {
      const payload = {
        fromCustomerId: customerInfo.id,
        toUserId: selectedContact.id,
        comment: commentText,
        commentType: "user"
      };

      await axios.post(
        `${URL}/projects/${selectedProject.id}/user-comments`,
        payload
      );
      fetchCommentsForUser(selectedContact.id);
    } catch (err) {
      console.error("Error sending comment", err);
    }
  };
  const markCommentsAsRead = async (toUserId) => {
    try {
      const response = await axios.put(`${URL}/projects/${selectedProject.id}/teamMarkCommentsAsRead/${toUserId}`);
      const { data } = await axios.get(`${URL}/auth/getAllUsers`);
      if (data) {

        const visibleUsers = data.filter(
          (user) => visibleIds.includes(user.id) && user.id !== 1
        );
        fetchVisibleUserComments(visibleUsers)
      }
      setAllUsers(data);

    } catch (error) {
      console.log(error)
    }
  }
  const handleSendMessage = async (contact) => {
    setSelectedContact(contact);
    setModalOpen(true);
    fetchCommentsForUser(contact.id);
    markCommentsAsRead(contact.id)
  };
  useEffect(() => {
    if (message) {
      handleSendMessage(message.userDetails);
      navigate(location.pathname, { replace: true });
    }
  }, [message]);
  const fetchTeamMembers = async () => {
    setIsloading(true);
    try {
      const { data } = await axios.get(`${URL}/auth/getAllUsers`);
      if (data) {
        setIsloading(false);
        const visibleUsers = data.filter(
          (user) => visibleIds.includes(user.id) && user.id !== 1
        );
        fetchVisibleUserComments(visibleUsers)
      }
      setAllUsers(data);
    } catch (err) {
      console.error("Error fetching users", err);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);



  const visibleUsers = allUsers.filter(
    (user) => visibleIds.includes(user.id) && user.id !== 1
  );

  const remainingUsers = allUsers?.filter(
    (user) => remainingIds?.includes(user.id) && user.id !== 1
  );
  //Comment Count Funcitonlaity 
  const fetchVisibleUserComments = async (users) => {
    try {
      const commentCounts = await Promise.all(
        users.map(async (user) => {
          const { data } = await axios.get(
            `${URL}/projects/${selectedProject.id}/user-comments/${user.id}`
          );

          const unreadComments = data.filter(comment => comment.createdByType == "user");
          console.log({ unreadComments })
          const filterIsReadFalse = unreadComments.filter((comment) => comment.isRead === false)

          return { id: user.id, commentCount: filterIsReadFalse.length };
        })
      );
      setVisibleUserComments(commentCounts);
    } catch (err) {
      console.error("Error fetching visible user comment counts", err);
    }
  };

  console.log({ visibleUsers })

  return (
    <div>
      {loading ? (
        <div className="ForLoder"> <Loader /></div>

      ) : (
        <>
          <HeaderTab title="Team Members" />

          <div className={styles.contactList}>
            {visibleUsers.length > 0 && (
              <>
                {visibleUsers.map((user) => (
                  <div key={user.id} className={styles.contactCard}>
                    <img
                      src={
                        user.profileImage
                          ? `${url2}/${user?.profileImage}`
                          : "Svg/user-icon.svg"
                      }
                      alt={user.firstName}
                      className={styles.avatar}
                    />
                    <div className={styles.info}>
                      <div className={styles.name}>
                        {user.firstName}{" "}
                        <span className={styles.role}>({user.userRole})</span>
                      </div>
                      <div className={styles.phone}>{user.mobileNumber}</div>
                    </div>
                    <div className={styles.buttons}>
                      <button
                        onClick={() => {
                          if (user.mettingLink) {
                            window.open(user.mettingLink, '_blank'); // Opens in new tab
                          }
                        }}
                        className={styles.callBtn}
                      >
                        Book a Call
                      </button>
                      <button
                        className={styles.msgBtn}
                        onClick={() => handleSendMessage(user)}
                      >
                        Send Message

                      </button>
                      {(visibleUserComments.find((item) => item.id === user.id)?.commentCount || 0) > 0 && (
                        <span
                          className={styles.commentCount}
                          style={{ color: 'red', fontWeight: 'bold' }}
                        >
                          ({visibleUserComments.find((item) => item.id === user.id)?.commentCount})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
            {remainingUsers.length > 0 && (
              <>
                {remainingUsers.map((user) => (
                  <div key={user.id} className={styles.contactCard}>
                    <img
                      src={user.profileImage || "/Images/profile-picture.webp"}
                      alt={user.firstName}
                      className={styles.avatar}
                    />
                    <div className={styles.info}>
                      <div className={styles.name}>
                        {user.firstName}{" "}
                        <span className={styles.role}>({user.userRole})</span>
                      </div>
                      <div className={styles.phone}>{user.mobileNumber}</div>
                    </div>
                    <div className={styles.buttons}>
                      <button className={styles.callBtn}>Book a Call</button>
                      <button
                        className={styles.msgBtn}
                        onClick={() => handleSendMessage(user)}
                      >
                        Send Message
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Modal with custom content */}
          <Modal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            height="80vh"
          >
            <div>
              <div className={styles.header}>
                <p>
                  <b>Team Member -</b> {selectedContact?.firstName}
                </p>
              </div>

              <div className={styles.messages}>
                {[...userComments].reverse().map((msg, index) =>
                  msg.createdByType === "customer" ? (
                    <div key={index} className={styles.userMessageRow}>
                      <div className={styles.right}>
                        <div className={styles.messageBubbleUser}>{msg.comment}</div>
                        <div className={styles.timestamp2}>
                          <b>{msg.name || "Customer"}</b>
                          {" "}
                          {new Date(msg.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ width: 40, marginLeft: 8 }}></div>
                    </div>
                  ) : (
                    <div key={index} className={styles.supportMessageRow}>
                      <img
                        src={msg.profileImage ? `${url2}/${msg.profileImage}` : "Svg/user-icon.svg"}
                        alt="avatar"
                        className={styles.avatar}
                      />
                      <div>
                        <div className={styles.messageBubbleSupport}>
                          <p>{msg.comment}</p>
                        </div>
                        <br />
                        <div className={styles.superadmin}>
                          <b>{msg.name}</b> {msg.userRole ? `(${msg.userRole})` : ""}
                        </div>
                        <div className={styles.timestamp}>
                          {new Date(msg.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )
                )}

                <div ref={messagesEndRef} />
              </div>

              <div className={styles.commentBox}>
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Comment or (Leave your thought here)"
                  className={styles.inputField}
                />
                <button
                  className={styles.commentButton}
                  onClick={handleSubmitComment}
                  disabled={commentLoading}
                >
                  {commentLoading ? <Loader size="30px" /> : "Add Comment"}
                </button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
};

export default TeamMembers;
