import React, { useEffect, useRef, useState } from 'react';
import styles from '../CommentThread/CommentThread.module.css';
import axios from 'axios';
import URL from '../../config/api';
import { url2 } from '../../config/url';
import Loader from '../Loader/Loader';

const Comments = ({ documentId, onView }) => {
  const [comments, setComments] = useState([]);
  const [viewed, setViewed] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const customerInfo = JSON.parse(localStorage.getItem('customerInfo'));
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const [loading, setLoading] = useState(false);
  const isCustomer = !!customerInfo;
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchComments = async () => {
    try {
      const res = await axios.get(`${URL}/customerDoc/comments/${documentId}`);
      setComments(res.data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const postComment = async () => {
    if (!commentInput.trim()) return;

    const message = commentInput.trim();
    const now = new Date().toISOString();

    // Build optimistic temp comment to match API shape
    const customerName =
      customerInfo?.full_name ||
      customerInfo?.name ||
      `${customerInfo?.firstName || ''} ${customerInfo?.lastName || ''}`.trim() ||
      'Customer';

    const tempComment = isCustomer
      ? {
          message,
          createdAt: now,
          userId: null,
          customerId: customerInfo?.id,
          User: null,
          Customer: {
            id: customerInfo?.id,
            full_name: customerName,
            email: customerInfo?.email || '',
            profilePhoto: customerInfo?.profilePhoto || customerInfo?.profileImage || null,
          },
        }
      : {
          message,
          createdAt: now,
          userId: userInfo?.id,
          customerId: null,
          User: {
            id: userInfo?.id,
            firstName: userInfo?.firstName || 'Admin',
            lastName: userInfo?.lastName || '',
            email: userInfo?.email || '',
            userRole: userInfo?.userRole || '',
            profileImage: userInfo?.profileImage || null,
          },
          Customer: null,
        };

    setComments((prev) => [...prev, tempComment]);
    setCommentInput('');
    scrollToBottom();

    const payload = {
      documentId,
      message,
      ...(isCustomer ? { customerId: customerInfo.id } : { userId: userInfo.id }),
    };

    try {
      await axios.post(`${URL}/customerDoc/comments/`, payload);
      fetchComments(); // sync with server
    } catch (err) {
      console.error('Error posting comment:', err);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [documentId]);

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  useEffect(() => {
    if (comments.length > 0 && !viewed) {
      onView(documentId);
      setViewed(true);
    }
  }, [comments, viewed, onView, documentId]);

  return (
    <div className={styles.threadContainer}>
      <div className={styles.header} />

      <div className={styles.messages}>
        {comments.map((msg, index) =>
          msg.User ? (
            // Admin/User message (left)
            <div key={index} className={styles.supportMessageRow}>
              <div className={styles.imageRow}>
                <img
                  src={
                    msg.User.profileImage ? `${url2}/${msg.User.profileImage}` : 'Svg/user-icon.svg'
                  }
                  alt="avatar"
                  className={styles.avatar}
                />
              </div>
              <div>
                <div className={styles.messageBubbleSupport}>{msg.message}</div>
                <div className={styles.timestamp}>
                  {`${msg.User.firstName || ''} ${msg.User.lastName || ''}`.trim() || 'User'}
                  {msg.User.userRole ? ` (${msg.User.userRole})` : ''} •{' '}
                  {new Date(msg.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ) : (
            // Customer message (right)
            <div key={index} className={styles.userMessageRow}>
              <div className={styles.right}>
                <div className={styles.messageBubbleUser}>{msg.message}</div>
                <div className={styles.timestamp2}>
                  <b>{msg.Customer?.full_name || 'Customer'}</b>{' '}
                  {new Date(msg.createdAt).toLocaleString()}
                </div>
              </div>
              <div style={{ width: 40, marginLeft: 8 }} />
            </div>
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.commentBox}>
        <input
          type="text"
          placeholder="Comment or leave your thought here..."
          className={styles.inputField}
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && postComment()}
        />

        {commentInput.trim() && (
          <div
            disabled={loading}
            className={styles.commentButton}
            onClick={!loading ? postComment : null}
          >
            {loading ? (
              <Loader size={20} />
            ) : (
              <img src="/Svg/send-icon.svg" alt="Send" className={styles.sendIcon} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Comments;
