import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { atom, useAtom, useAtomValue } from 'jotai';
import React, { useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Chat, { ChatMessageType, ChatType } from './Chat';
import Contacts, { Contact } from './Contacts';
import { socket } from './socket';
import { contactsAtom } from './Contacts';

export const meUserIdAtom = atom<string>("");
export const selectedContactAtom = atom<Contact | null>(null);

function Home() {
    const meUserId = useAtomValue(meUserIdAtom);
    const [contacts, setContacts] = useAtom(contactsAtom);
    const [selectedContact, setSelectedContact] = useAtom(selectedContactAtom);
    const [selectedContactChat, setSelectedContactChat] = React.useState<ChatType | null>(null);
    const [chats, setChats] = React.useState(new Map());

    const handleIncomingMessageReadAck = useMemo(() => (data: any) => {
        const { id, to } = data;
        console.log('read ack', data);
        chats.get(to).messages.find((m: ChatMessageType) => m.id === id).isRead = true;
        setChats(new Map(chats));
    }, [chats]);

    const handleIncomingMessageAck = useMemo(() => (data: any) => {
        const { id, to } = data;
        console.log('ack', data);
        chats.get(to).messages.find((m: ChatMessageType) => m.id === id).isDelivered = true;
        setChats(new Map(chats));

    }, [chats]);

    const handleIncomingMessage = useMemo(() => (data: any) => {
        const { id, from, message, timestamp } = data;

        const _message: ChatMessageType = {
            id,
            from,
            text: message,
            timestamp: parseInt(timestamp),
            isDelivered: false,
            isRead: false
        };

        if (!chats.has(from)) {
            chats.set(from, { messages: [], contact: { id: from, name: from } });
            setChats(new Map(chats));
        }

        chats.get(from).messages.push(_message);

        setChats(new Map(chats));
        setSelectedContactChat({ ...chats.get(from) });

        if (selectedContact?.id !== from) {
            console.log('new message', data);

            // find contact and increment newMessages
            const contact = contacts.find((c) => c.id === from);
            if (contact) {
                contact.newMessages = (contact.newMessages || 0) + 1;
                setContacts([...contacts]);
                localStorage.setItem(`${meUserId}.contacts`, JSON.stringify(contacts));
            }
        }

    }, [chats, selectedContact, contacts, setContacts, meUserId]);

    // useEffect(() => {
    //     console.log('connecting socket');
    //     socket.connect();

    //     return () => {
    //         socket.disconnect();
    //     };
    // }, []);

    useEffect(() => {
        socket.on('message', handleIncomingMessage);
        socket.on('message_ack', handleIncomingMessageAck)
        socket.on('message_read_ack', handleIncomingMessageReadAck)

        return () => {
            socket.off('message', handleIncomingMessage);
            socket.off('message_ack', handleIncomingMessageAck)
            socket.off('message_read_ack', handleIncomingMessageReadAck)
        };
    }, [handleIncomingMessage, handleIncomingMessageAck, handleIncomingMessageReadAck]);

    useEffect(() => {
        if (!selectedContact) {
            setSelectedContactChat(null);
            return;
        }

        if (!chats.has(selectedContact.id)) {
            chats.set(selectedContact.id, { messages: [], contact: selectedContact });
            setChats(new Map(chats));
        }
        setSelectedContactChat(chats.get(selectedContact.id));
    }, [selectedContact, chats]);

    const handleContactSelected = useCallback((contact: Contact | null) => {
        contact?.newMessages && (contact.newMessages = 0);
        setSelectedContact(contact);

        localStorage.setItem(`${meUserId}.contacts`, JSON.stringify(contacts));

    }, [setSelectedContact, contacts, meUserId]);

    const handleSendNewMessage = (message: string) => {
        if (selectedContactChat) {
            const _message: ChatMessageType = {
                id: uuidv4(),
                from: meUserId,
                text: message,
                timestamp: Date.now(),
                isDelivered: false,
                isRead: false
            };

            selectedContactChat.messages.push(_message);

            setSelectedContactChat({ ...selectedContactChat });

            socket.emit('send_message', {
                id: _message.id,
                from: _message.from,
                to: selectedContact?.id,
                timestamp: _message.timestamp,
                message
            });
        }
    }

    return (
        <Stack display="flex" flexDirection="row" height="100vh">
            <Box sx={{ border: "1px solid lightgray", padding: "10px" }} minWidth="100px" display="flex" gap={2} flexDirection="column">
                <Box ><strong>{meUserId}</strong> Contacts</Box>
                <Box flex={1} sx={{ overflow: "auto" }}>
                    <Contacts onContactSelect={handleContactSelected} />
                </Box>
            </Box>
            {selectedContact && selectedContactChat &&
                <Box sx={{ border: "1px solid lightgray", padding: "10px", flex: 1 }} display="flex" flexDirection="column">
                    <Box >Chat with <strong>{selectedContactChat.contact.name}</strong></Box>
                    <Box flex={1} sx={{ overflow: "auto" }}>
                        <Chat chat={selectedContactChat} onSendNewMessage={handleSendNewMessage} />
                    </Box>
                </Box>}
        </Stack>
    );
}

export default Home;
