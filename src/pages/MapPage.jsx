import React, { useState } from "react";
import { Box, Typography, TextField, Button } from "@mui/material";
import { db } from "../firebase";
import { serverTimestamp, addDoc, collection } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const MapPage = () => {
  const [title, setTitle] = useState();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    // Add a new document in collection "events"
    await addDoc(collection(db, "events"), {
      name: title,
      timestamp: serverTimestamp(),
    });
  };

  return (
    <Box
      sx={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Typography variant="h5">{title} create</Typography>
      <TextField
        id="outlined-basic"
        label="Title"
        variant="outlined"
        onChange={(e) => setTitle(e.target.value)}
      />
      <Button variant="contained" onClick={() => navigate("/create")}>
        Create Event
      </Button>
    </Box>
  );
};

export default MapPage;
