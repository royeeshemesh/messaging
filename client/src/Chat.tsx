import { Button, Input, Stack } from "@mui/material";
import React from "react";

import Box from "@mui/material/Box";
import { styled } from "styled-components";
import { Contact } from "./Contacts";

import CheckIcon from '@mui/icons-material/Check';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useAtomValue } from "jotai";
import { meUserIdAtom, selectedContactAtom } from "./Home";
import { socket } from "./socket";

export type ChatMessageType = {
    id: string;
    from: string;
    text: string;
    timestamp: number;
    isDelivered?: boolean;
    isDeliveredAck?: boolean;
    isRead?: boolean;
    isReadAck?: boolean;
}

export type ChatType = {
    messages: ChatMessageType[];
    contact: Contact;
}

type ChatProps = {
    chat: ChatType | null;
    onSendNewMessage: (message: string) => void;
}

const Chat: React.FC<ChatProps> = ({ chat, onSendNewMessage }) => {
    const meUserId = useAtomValue(meUserIdAtom);
    const selectedContact = useAtomValue(selectedContactAtom);
    const [newMessage, setNewMessage] = React.useState("");

    const handleSendNewMessage = () => {
        onSendNewMessage(newMessage)
        setNewMessage("");
    }

    const handleMessageKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSendNewMessage();
        }
    }

    if (chat?.contact.id !== selectedContact?.id) {
        return null;
    }

    return (
        <Stack display="flex" flexDirection="column" height="100%" width="100%">
            <StyledMessages flex={1} height="100%" >
                {chat?.messages.map((message) => {

                    if (!message.isReadAck && message.from !== meUserId) {
                        console.log('sending read ack', message);
                        socket.emit('read_ack', { id: message.id, from: meUserId, to: message.from });
                        message.isReadAck = true;
                    }

                    return (
                        <section key={message.id} className={message.from === meUserId ? "me" : "them"}>
                            <section className="msgs">
                                <div className="p">
                                    {message.text}

                                    <Stack display="flex" flexDirection="row" gap={1} justifyContent="space-between">
                                        <small className="time">{new Date(message.timestamp).toLocaleTimeString()}</small>
                                        {message.from === meUserId && <span className="status">
                                            {message.isDelivered && !message.isRead && <CheckIcon fontSize="small" />}
                                            {message.isRead && <DoneAllIcon fontSize="small" />}
                                        </span>}
                                    </Stack>
                                </div>
                            </section>
                        </section>
                    )
                })}
            </StyledMessages>
            <Box marginTop={2} width="100%" display="flex" gap={1}>
                <Input placeholder="Enter your message" sx={{ flex: 1 }} value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyUp={handleMessageKeyUp} />
                <Button variant="contained" size="small" onClick={handleSendNewMessage}>Send</Button>
            </Box>
        </Stack>
    );
}

const StyledMessages = styled(Box)`
overflow: auto;
    section {
        margin: 0 auto;
        position: relative;
        display: block;
        max-width: 98%;
    }

    .p {
        display: flex;
        margin: 0 0 2px;
        padding: 0.5em 1em 0.65em;
        border-radius: 4px;
        background: #e5e5ea;
        clear: both;
        position: relative;
        flex-direction: column;
        max-width: 80%;
        min-width: 30%;

    }

    .p .time {
        font-size: 0.75em;
        margin-top: 0.5em;
    }

    .p .status {
        font-size: 0.75em;
        margin-top: 0.2em;
    }

    .them .p {
        width:auto;
        border-top-right-radius: 1em;
        border-bottom-right-radius: 1em;
    }
    .them .p:last-child::after {
        content: "";
        position: absolute;
        left: -0.5em;
        bottom: 0;
        width: 0.5em;
        height: 1em;
        border-right: 0.5em solid #e5e5ea;
        border-bottom-right-radius: 1em 0.5em;
    }

    .me .p {
        float: right;
        background-color: #1289fe;
        color: white;
        border-top-left-radius: 1em;
        border-bottom-left-radius: 1em;
    }
    .me .p:last-child::after {
        content: "";
        position: absolute;
        right: -0.5em;
        bottom: 0;
        width: 0.5em;
        height: 1em;
        border-left: 0.5em solid #1289fe;
        border-bottom-left-radius: 1em 0.5em;
    }

    .p:first-child {
        border-top-right-radius: 1em;
        border-top-left-radius: 1em;
    }

    .p:last-child {
        border-bottom-left-radius: 1em;
        margin-bottom: 8px;
    }
    .me .p:last-child {
        border-bottom-left-radius: 1em;
        border-bottom-right-radius: 1em;
        margin-bottom: 8px;
    }
`;

export default Chat;
