import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import styles from '../CommentThread/CommentThread.module.css';
import URL from '../../config/api';
import { url2 } from '../../config/url';
import Loader from '../Loader/Loader';

const CommentThread = ({ issue }) => {
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [loading, setLoading] = useState(false);

  const customerInfo = (() => {
    try {
      return JSON.parse(localStorage.getItem('customerInfo'));
    } catch {
      return null;
    }
  })();

  const isCustomer = !!customerInfo;
  const customerId = customerInfo?.id;
  const customerName = customerInfo?.full_name || 'You';
  const customerPhoto = customerInfo?.profilePhoto || '';

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchComments = async () => {
    try {
      const res = await axios.get(`${URL}/punchlist/${issue.id}/comments`);
      setComments(res.data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const handleAddComment = async () => {
    const text = commentInput.trim();
    if (!text) return;

    const tempComment = {
      id: `temp-${Date.now()}`,
      comment: text,
      createdAt: new Date().toISOString(),
      createdByType: 'customer',
      name: customerName,                
      profileImage: customerPhoto,      
      userRole: 'Customer',
      isRead: false,
      _optimistic: true,
    };

    setLoading(true);
    setComments((prev) => [...prev, tempComment]);
    setCommentInput('');
    scrollToBottom();

    try {
      await axios.post(
        `${URL}/projects/${issue.projectId}/punchlist/${issue.id}/comments`,
        {
          comment: text,
          clientId: customerId,
        }
      );
      await fetchComments();
    } catch (err) {
      console.error('Error posting comment:', err);
      await fetchComments();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [issue.id]);

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  return (
    <div className={styles.threadContainer}>
      <div className={styles.header}>
        <p><b>Comments History</b></p>
      </div>

      <div className={styles.messages}>
        {[...comments].reverse().map((msg, index) => {
          const isUser = msg.createdByType === 'user';
          const avatarSrc = msg.profileImage
            ? `${url2}/${msg.profileImage}`
            : 'Svg/user-icon.svg';
          const timestamp = new Date(msg.createdAt).toLocaleString();

          return isUser ? (
            // LEFT (staff/admin)
            <div key={msg.id || index} className={styles.supportMessageRow}>
              <div className={styles.imageRow}>
                <img src={avatarSrc} alt="avatar" className={styles.avatar} />
              </div>
              <div>
                <div className={styles.messageBubbleSupport}>{msg.comment}</div>
                <div className={styles.timestamp}>
                  {msg.name}
                  {msg.userRole ? ` (${msg.userRole})` : ''} • {timestamp}
                </div>
              </div>
            </div>
          ) : (
            // RIGHT (customer)
            <div key={msg.id || index} className={styles.userMessageRow}>
              <div className={styles.right}>
                <div className={styles.messageBubbleUser}>{msg.comment}</div>
                <div className={styles.timestamp2}>
                  {msg.name ? `${msg.name} • ` : ''}{timestamp}
                </div>
              </div>
              {/* <div className={styles.imageRow} style={{ marginLeft: 8 }}>
                <img src={avatarSrc} alt="avatar" className={styles.avatar} />
              </div> */}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {isCustomer && (
        <div className={styles.commentBox}>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              placeholder="Comment or (Leave your thought here)"
              className={styles.inputField}
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) handleAddComment();
              }}
              disabled={loading}
            />
            <div
              className={styles.sendButton}
              onClick={() => !loading && handleAddComment()}
              role="button"
              aria-label="Send"
            >
              {loading ? (
                <Loader size="20px" />
              ) : (
                commentInput.trim() && (
                  <img src="/Svg/send-icon.svg" alt="Send" className={styles.sendIcon} />
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentThread;
