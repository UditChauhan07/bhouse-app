import React, { useEffect, useState, useRef } from "react";
import styles from "../Docs2/Docs2.module.css";
import Modal from "../Modal/Modal";
import { url2 } from "../../config/url";
import URL from "../../config/api";
import axios from "axios";
import Loader from "../Loader/Loader";
import { useLocation, useNavigate } from "react-router-dom";





const Docs2 = ({ onTotalDocsChange }) => {
  const [newComment, setNewComment] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [commentCounts, setCommentCounts] = useState({});
  const [isFileLoading, setIsFileLoading] = useState(true);

  // New states for file list modal
  const [isFileListModalOpen, setIsFileListModalOpen] = useState(false);
  const [currentDocTypeFiles, setCurrentDocTypeFiles] = useState([]);
  const [currentDocTypeTitle, setCurrentDocTypeTitle] = useState("");

  const location = useLocation();
  const bottomRef = useRef(null);
  const message = location.state?.message;
  const navigate = useNavigate();

  const [projectData, setProjectData] = useState({
    proposals: [],
    floorPlans: [],
    cad: [],
    salesAggrement: [],
    otherDocuments: [],
    presentation: [],
    // acknowledgements: [],
    receivingReports: [],
    finalInvoice: [],
  });

  const handleAddComment = async () => {
    setLoading(true);
    const commentText = newComment.trim();
    if (!commentText || !selectedDoc?.fileUrl) return;

    const projectId = JSON.parse(localStorage.getItem("selectedProjectId"));
    const clientInfo = JSON.parse(localStorage.getItem("customerInfo") || "{}");

    let windowsPath = selectedDoc.fileUrl;
    if (windowsPath.startsWith("/")) {
      windowsPath = windowsPath.substring(1);
    }

    const titleToCategory = {
      "Detailed Proposal": "proposals",
      "Options Presentation": "presentation",
      "Pro Forma Invoice": "floorPlans",
      "COI(CERTIFICATE)": "cad", // Updated title
      "Sales Agreement": "salesAggrement",
      "Product Maintenance": "otherDocuments",
      "Final Invoice": "finalInvoice",
      // "Acknowledgements": "acknowledgements",
      "Receiving Reports": "receivingReports",
    };
    const category = titleToCategory[selectedDoc?.title] || "otherDocuments";

    const tempComment = {
      comment: commentText,
      createdAt: new Date().toISOString(),
      customer: {
        full_name:
          clientInfo?.full_name ||
          clientInfo?.name ||
          [clientInfo?.firstName, clientInfo?.lastName].filter(Boolean).join(" ") ||
          "You",
        email: clientInfo?.email || "",
      },
    };
    setComments((prev) => [...prev, tempComment]);
    setNewComment("");

    try {
      await axios.post(`${URL}/projects/${projectId}/file-comments`, {
        comment: commentText,
        filePath: windowsPath,
        clientId: clientInfo?.id,
        category,
      });
      fetchComments(selectedDoc.fileUrl); // Re-fetch comments to get the actual, saved comment
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProject = async () => {
    const projectId = JSON.parse(localStorage.getItem("selectedProjectId"));
    if (!projectId) {
      console.error("No project ID found in localStorage.");
      return;
    }
    try {
      const res = await axios.get(`${URL}/projects/${projectId}`);
      const project = res.data;
      setProjectData({
        proposals: JSON.parse(project.proposals || "[]"),
        floorPlans: JSON.parse(project.floorPlans || "[]"),
        cad: JSON.parse(project.cad || "[]"),
        salesAggrement: JSON.parse(project.salesAggrement || "[]"),
        presentation: JSON.parse(project.presentation || "[]"),
        otherDocuments: JSON.parse(project.otherDocuments || "[]"),
        // acknowledgements: JSON.parse(project.acknowledgements || "[]"),
        receivingReports: JSON.parse(project.receivingReports || "[]"),
        finalInvoice: JSON.parse(project.finalInvoice || "[]"),
      });
      fetchAllComments(project);
    } catch (err) {
      console.error("Failed to fetch project:", err);
    }
  };

  const fetchComments = async (fileUrl) => {
    if (!fileUrl) return;
    const projectId = JSON.parse(localStorage.getItem("selectedProjectId"));
    let filePath = fileUrl;
    if (filePath.startsWith("/")) {
      filePath = filePath.substring(1);
    }
    try {
      const res = await axios.get(`${URL}/projects/${projectId}/file-comments`, {
        params: { filePath },
      });
      setComments(res.data || []);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    }
  };

  const fetchAllComments = async (project) => {
    const allFileFields = [
      "proposals",
      "floorPlans",
      "cad",
      "salesAggrement",
      "presentation",
      "otherDocuments",
      // "acknowledgements",
      "receivingReports",
      "finalInvoice",
    ];

    const projectId = JSON.parse(localStorage.getItem("selectedProjectId"));
    const newCommentCounts = {};
    for (const field of allFileFields) {
      const files = JSON.parse(project[field] || "[]");
      for (const file of files) {
        let filePath = file.url || file.filePath || file; // Handles objects and direct strings
        if (filePath.startsWith("/")) {
          filePath = filePath.substring(1);
        }
        try {
          const res = await axios.get(
            `${URL}/projects/${projectId}/file-comments`,
            {
              params: { filePath },
            }
          );
          const unreadComments = res.data.filter(
            (comment) => comment.isRead === false && comment.user !== null
          );
          newCommentCounts[filePath] = unreadComments.length || 0;
        } catch (err) {
          console.error(`Failed to fetch comments for ${filePath}:`, err);
          newCommentCounts[filePath] = 0;
        }
      }
    }
    setCommentCounts(newCommentCounts);
  };

  useEffect(() => {
    fetchProject();
  }, []);

  const documentMarkCommentsAsRead = async (filePath) => {
    try {
      let pathToSend = filePath;
      if (pathToSend.startsWith("/")) {
        pathToSend = pathToSend.substring(1);
      }
      await axios.put(
        `${URL}/documentMarkCommentsAsRead`,
        {},
        {
          params: { filePath: pathToSend },
        }
      );
      fetchProject(); // Re-fetch project to update comment counts after marking as read
    } catch (error) {
      console.log("Error updating comments:", error);
    }
  };

  const handleDocTypeClick = (docTitle, files) => {
    if (!files || files.length === 0) {
      // No files, do nothing or show a message
      return;
    }

    setCurrentDocTypeTitle(docTitle); // Set the title for the file list modal

    if (files.length === 1) {
      const fileUrl = files[0].url || files[0].filePath || files[0];
      const normalizedUrl = `/${fileUrl?.replace(/\\/g, "/")}`;
      setIsFileLoading(true);
      setSelectedDoc({ title: docTitle, fileUrl: normalizedUrl });
      fetchComments(normalizedUrl);
      documentMarkCommentsAsRead(fileUrl);
      setIsModalOpen(true); // Open the comment modal directly
    } else {
      // Multiple files, open the file list modal
      setCurrentDocTypeFiles(files);
      setIsFileListModalOpen(true);
    }
  };

  const handleFileClick = (fileObject) => {
    const fileUrl = fileObject.url || fileObject.filePath || fileObject;
    const normalizedUrl = `/${fileUrl?.replace(/\\/g, "/")}`;
    setIsFileLoading(true);
    setSelectedDoc({ title: currentDocTypeTitle, fileUrl: normalizedUrl }); // Use the stored title
    fetchComments(normalizedUrl);
    documentMarkCommentsAsRead(fileUrl);
    setIsFileListModalOpen(false); // Close the file list modal
    setIsModalOpen(true); // Open the comment modal
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDoc(null);
    setComments([]);
  };

  const handleCloseFileListModal = () => {
    setIsFileListModalOpen(false);
    setCurrentDocTypeFiles([]);
    setCurrentDocTypeTitle("");
  };

  const docList = [
    {
      title: "Detailed Proposal",
      icon: "Svg/detailed-proposal.svg",
      files: projectData.proposals,
    },
    {
      title: "Options Presentation",
      icon: "Svg/options-presentation.svg",
      files: projectData?.presentation,
    },
    {
      title: "Pro Forma Invoice",
      icon: "Svg/floor-plan.svg",
      files: projectData.floorPlans,
    },
    {
      title: "COI(CERTIFICATE)",
      icon: "Svg/cad-file.svg",
      files: projectData?.cad,
    },
    {
      title: "Sales Agreement",
      icon: "Svg/sales-icon.svg",
      files: projectData?.salesAggrement,
    },
    {
      title: "Product Maintenance",
      icon: "Svg/Coi.svg",
      files: projectData?.otherDocuments,
    },
    // {
    //   title: "Acknowledgements",
    //   icon: "Svg/sample-icon.svg",
    //   files: projectData?.acknowledgements,
    // },
    {
      title: "Receiving Reports",
      icon: "Svg/final-invoice.svg",
      files: projectData?.receivingReports,
    },
    {
      title: "Final Invoice",
      icon: "Svg/detailed-proposal.svg",
      files: projectData.finalInvoice,
    },
  ];

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments]);

  useEffect(() => {
    if (message) {
      const docListForMessage = [
        { key: "proposals", title: "Detailed Proposal" },
        { key: "presentation", title: "Options Presentation" },
        { key: "floorPlans", title: "Pro Forma Invoice" },
        { key: "cad", title: "COI(CERTIFICATE)" },
        { key: "salesAggrement", title: "Sales Agreement" },
        { key: "receivingReports", title: "Receiving Reports" },
        // { key: "acknowledgements", title: "Acknowledgements" },
        { key: "finalInvoice", title: "Final Invoice" },
        { key: "otherDocuments", title: "Product Maintenance" },
      ];

      const matchedDoc = docListForMessage.find(
        (doc) => doc.key === message.documentType
      );
      const title = matchedDoc?.title || "Document";
      setCurrentDocTypeTitle(title); // Set the title for the incoming message's document

      // Assuming message.filePath refers to a single file's path for direct opening
      handleFileClick({ url: message.filePath, filePath: message.filePath });
      navigate(location.pathname, { replace: true });
    }
  }, [message, navigate, location.pathname]);

  const handleDownload = async () => {
    if (!selectedDoc || !selectedDoc.fileUrl) {
      console.error("No file URL available for download.");
      return;
    }

    try {
      const fileUrl = `${url2}${selectedDoc.fileUrl}`;
      const response = await fetch(fileUrl);

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Document.pdf"); // Consider making this dynamic based on selectedDoc.title or file type
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download PDF:", error);
    }
  };

  // Calculate total comments for the onTotalDocsChange prop
  const totalComments = Object.values(commentCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  useEffect(() => {
    if (onTotalDocsChange) {
      onTotalDocsChange(totalComments);
    }
  }, [totalComments, onTotalDocsChange]);
  // Add this helper function within your Docs2 component, or as a standalone utility
  const getFileIcon = (fileName) => {
    if (!fileName) return "Svg/PDF_file_icon.svg.png"; // Default icon for unknown/no file

    const lowerCaseFileName = fileName.toLowerCase();

    if (lowerCaseFileName.endsWith(".pdf")) {
      return "Svg/PDF_file_icon.svg.png"; // Path to your PDF icon
    } else if (
      lowerCaseFileName.endsWith(".jpg") ||
      lowerCaseFileName.endsWith(".jpeg") ||
      lowerCaseFileName.endsWith(".png") ||
      lowerCaseFileName.endsWith(".gif") ||
      lowerCaseFileName.endsWith(".bmp") ||
      lowerCaseFileName.endsWith(".svg")
    ) {
      return "Svg/av5c8336583e291842624.png"; // Path to your image icon
    } else if (
      lowerCaseFileName.endsWith(".doc") ||
      lowerCaseFileName.endsWith(".docx")
    ) {
      return "Svg/doc-icon.svg"; // Path to your Word document icon
    } else if (
      lowerCaseFileName.endsWith(".xls") ||
      lowerCaseFileName.endsWith(".xlsx")
    ) {
      return "Svg/excel-icon.svg"; // Path to your Excel icon
    } else if (
      lowerCaseFileName.endsWith(".ppt") ||
      lowerCaseFileName.endsWith(".pptx")
    ) {
      return "Svg/ppt-icon.svg"; // Path to your PowerPoint icon
    } else if (
      lowerCaseFileName.endsWith(".dwg") ||
      lowerCaseFileName.endsWith(".dxf") ||
      lowerCaseFileName.endsWith(".cad")
    ) {
      return "Svg/cad-file.svg"; // Path to your CAD icon
    } else if (
      lowerCaseFileName.endsWith(".zip") ||
      lowerCaseFileName.endsWith(".rar")
    ) {
      return "Svg/zip-icon.svg"; // Path to your compressed file icon
    } else {
      return "Svg/av5c8336583e291842624.png"; // Generic file icon for other types
    }
  };
  return (
    <div>
      <div className={styles.container}>
        {docList.map((doc, index) => {
          const hasFiles = doc.files && doc.files.length > 0;
          return (
            <div
              onClick={
                hasFiles ? () => handleDocTypeClick(doc.title, doc.files) : null
              }
              key={index}
              className={styles.card}
            >
              <div className={styles.left}>
                <div className={styles.icon}>
                  <img src={doc.icon} alt={doc.title} />
                </div>
                <span className={styles.title}>{doc.title}</span>
              </div>

              {hasFiles ? (
                <div
                  className={styles.commentLink}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card onClick from firing again
                    handleDocTypeClick(doc.title, doc.files);
                  }}
                >
                  <img src="Svg/edit-icon.svg" alt="comment" />
                  <p>Comment</p>
                  {/* Calculate total unread comments for this document type */}
                  {doc.files.some(
                    (file) =>
                      commentCounts[
                      (file.url || file.filePath || file)?.replace(/^\//, "")
                      ] > 0
                  ) && (
                      <span
                        className={styles.commentCount}
                        style={{ color: "red", fontWeight: "bold" }}
                      >
                        (
                        {doc.files.reduce(
                          (sum, file) =>
                            sum +
                            (commentCounts[
                              (file.url || file.filePath || file)?.replace(
                                /^\//,
                                ""
                              )
                            ] || 0),
                          0
                        )}
                        )
                      </span>
                    )}
                </div>
              ) : (
                <div className={styles.noFile}>
                  <p style={{ color: "gray", fontSize: "12px" }}>
                    Not uploaded yet
                  </p>
                </div>
              )}
            </div>
          );
        })}

        <p className={styles.note}>
          If all documents are updated, ignore this; otherwise, <b>update</b>{" "}
          the <b>latest one</b>.
        </p>
      </div>

      {/* Main Comment Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} height="92vh">
        <div className={styles.modalInner}>
          <h2 className={styles.modalTitle}>{selectedDoc?.title}</h2>

          {selectedDoc?.fileUrl && (
            <div className={styles.previewBox}>
              {isFileLoading && (
                <div className={styles.loaderOverlay}>
                  <Loader size={30} />
                </div>
              )}

              {(() => {
                const fileUrl = selectedDoc?.fileUrl || "";
                const fullUrl = `${url2}${fileUrl}`;

                const isPdf = fileUrl.endsWith(".pdf");
                const isCadFile =
                  fileUrl.endsWith(".dwg") ||
                  fileUrl.endsWith(".dxf") ||
                  fileUrl.endsWith(".cad");
                const isImage =
                  fileUrl.endsWith(".jpg") ||
                  fileUrl.endsWith(".jpeg") ||
                  fileUrl.endsWith(".png") ||
                  fileUrl.endsWith(".gif");

                if (isPdf) {
                  return (
                    <iframe
                      height="400px"
                      width="100%"
                      src={`https://docs.google.com/gview?url=${encodeURIComponent(
                        fullUrl
                      )}&embedded=true`}
                      onLoad={() => setIsFileLoading(false)}
                      title="PDF Preview"
                      frameBorder="0"
                    />
                  );
                } else if (isCadFile) {
                  if (isFileLoading) setIsFileLoading(false); // No automatic loading for CAD
                  return (
                    <div style={{ textAlign: "center", padding: "20px" }}>
                      <p>No preview available for this file type.</p>
                      <button
                        onClick={handleDownload}
                        style={{
                          display: "inline-block",
                          padding: "10px 20px",
                          backgroundColor: "#007bff",
                          color: "white",
                          borderRadius: "5px",
                          textDecoration: "none",
                          marginTop: "10px",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Download File
                      </button>
                    </div>
                  );
                } else if (isImage) {
                  return (
                    <img
                      src={fullUrl}
                      alt={selectedDoc?.title}
                      onLoad={() => setIsFileLoading(false)}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "400px",
                        objectFit: "contain",
                        display: "block",
                        margin: "0 auto",
                        borderRadius: "8px",
                      }}
                    />
                  );
                } else {
                  if (isFileLoading) setIsFileLoading(false); // No automatic loading for unknown types
                  return (
                    <div style={{ textAlign: "center", padding: "20px" }}>
                      <p>No preview available for this file type.</p>
                      <button
                        onClick={handleDownload}
                        style={{
                          display: "inline-block",
                          padding: "10px 20px",
                          backgroundColor: "#007bff",
                          color: "white",
                          borderRadius: "5px",
                          textDecoration: "none",
                          marginTop: "10px",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Download File
                      </button>
                    </div>
                  );
                }
              })()}
            </div>
          )}
          <div className={styles.chatWrapper}>
            {comments.map((item, index) => {
              const isUser = item.customer;
              const isLast = index === comments.length - 1;

              return (
                <div
                  key={index}
                  ref={isLast ? bottomRef : null}
                  className={`${styles.commentItem} ${isUser ? styles.right : styles.left
                    }`}
                >
                  {!isUser && (
                    <div className={styles.adminBlock}>
                      <img
                        src={
                          item.user.profileImage
                            ? `${url2}/${item.user.profileImage}`
                            : "Svg/user-icon.svg"
                        }
                        alt="Admin DP"
                        className={styles.avatar}
                      />
                      <div>
                        <div className={styles.adminBubble}>
                          <p>{item.comment}</p>
                        </div>
                        <span className={styles.timestamp}>
                          {new Date(item.createdAt)
                            .toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "long",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                            .replace(",", "")}{" "}
                          &nbsp;•&nbsp;
                          {item?.user?.firstName}
                          {item?.user?.userRole
                            ? ` by ${item?.user?.userRole}`
                            : ""}
                        </span>
                      </div>
                    </div>
                  )}

                  {isUser && (
                    <div>
                      <div className={styles.userBubble}>
                        <p>{item.comment}</p>
                      </div>
                      <span className={`${styles.timestamp} ${styles.rightTime}`}>
                        {new Date(item.createdAt)
                          .toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "long",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                          .replace(",", "")}
                        &nbsp;•&nbsp;
                        {item?.customer?.full_name ||
                          item?.customer?.name ||
                          item?.customer?.email ||
                          "Customer"}
                      </span>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
          {/* Ankush Code Start */}
          <div className={styles.commentInput}>
            <input
              type="text"
              placeholder="Comment or (Leave your thought here)"
              className={styles.inputBox}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            {newComment.trim() && (
              <div
                disabled={loading}
                className={styles.commentButton}
                onClick={!loading ? handleAddComment : null}
              >
                {!loading ? (
                  <img
                    src="/Svg/send-icon.svg"
                    alt="Send"
                    className={styles.sendIcon}
                  />
                ) : (
                  <Loader size={20} />
                )}
              </div>
            )}
          </div>
          {/* Ankush Code End */}
        </div>
      </Modal>

      {/* File List Modal */}
      <Modal
        isOpen={isFileListModalOpen}
        onClose={handleCloseFileListModal}
        height="90vh"
      >
        <div className={styles.modalInner}>
          <h2 className={styles.modalTitle}>{currentDocTypeTitle} Files</h2>
          <div className={styles.fileList}>
            {currentDocTypeFiles.length > 0 ? (
              currentDocTypeFiles.map((file, index) => {
                const fileName =
                  file.name ||
                  file.url?.split("/").pop() ||
                  file.filePath?.split("/").pop() ||
                  `File ${index + 1}`;
                const fileUrlForCount = file.url || file.filePath || file;
                const normalizedFileUrlForCount = fileUrlForCount?.replace(/^\//, "");

                // Determine the icon based on the fileName
                const iconSrc = getFileIcon(fileName);

                return (
                  <div
                    key={index}
                    className={styles.fileListItem}
                    onClick={() => handleFileClick(file)}
                  >
                    {/* Add the icon here */}
                    <img src={iconSrc} alt="file type icon" className={styles.fileIcon} />
                    <span>{fileName}</span>
                    {commentCounts[normalizedFileUrlForCount] > 0 && (
                      <span
                        className={styles.commentCount}
                        style={{ color: "red", fontWeight: "bold" }}
                      >
                        ({commentCounts[normalizedFileUrlForCount]})
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <p>No files uploaded for this category yet.</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Docs2;