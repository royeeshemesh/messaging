import DeleteIcon from '@mui/icons-material/Delete';
import { Box, Button, Input } from "@mui/material";
import { useAtomValue } from 'jotai';
import { useEffect, useState } from "react";
import styled from "styled-components";
import { meUserIdAtom } from "./Home";
import { atom, useAtom } from 'jotai';

export const contactsAtom = atom<Contact[]>([]);

export type Contact = {
    id: string;
    name: string;
    newMessages?: number;
}

type ContactsProps = {
    onContactSelect: (contact: Contact | null) => void;
}

const Contacts: React.FC<ContactsProps> = ({ onContactSelect }) => {
    const meUserId = useAtomValue(meUserIdAtom);
    const [newContactId, setNewContactId] = useState<string>("");
    const [contacts, setContacts] = useAtom(contactsAtom);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

    useEffect(() => {
        const contacts = localStorage.getItem(`${meUserId}.contacts`);
        if (contacts) {
            setContacts(JSON.parse(contacts));
        }

        const selectedContact = localStorage.getItem(`${meUserId}.selectedContact`);
        if (selectedContact) {
            setSelectedContact(JSON.parse(selectedContact));
        }
    }, [meUserId, setContacts]);

    useEffect(() => {
        localStorage.setItem(`${meUserId}.contacts`, JSON.stringify(contacts));
    }, [meUserId, contacts]);

    useEffect(() => {
        onContactSelect(selectedContact);
    }, [selectedContact, onContactSelect]);

    const handleOnAddContact = () => {
        setContacts((prevContacts) => {
            return [...prevContacts, { id: newContactId, name: newContactId }];
        });
        setNewContactId("");
    }

    const handleSelectContact = (e: React.MouseEvent<HTMLDivElement>, contact: Contact) => {
        if (e.isDefaultPrevented()) {
            return;
        }

        setSelectedContact(contact);
        localStorage.setItem(`${meUserId}.selectedContact`, JSON.stringify(contact));
    }

    const handleDeleteContact = (e: React.MouseEvent<HTMLButtonElement>, contact: Contact) => {
        e.preventDefault();

        setContacts((prevContacts) => {
            return prevContacts.filter((c) => c.id !== contact.id);
        });
        if (selectedContact?.id === contact.id) {
            setSelectedContact(null);
            localStorage.removeItem(`${meUserId}.selectedContact`);
        }
    }

    return (
        <Box>
            <Box marginBottom={2} display="flex" alignItems="center" gap={1}>
                <Input placeholder="New Contact Id" value={newContactId} onChange={e => setNewContactId(e.target.value)} />
                <Button variant="contained" size="small" onClick={handleOnAddContact}>Add</Button>
            </Box>
            {contacts.map((contact) => (
                <StyledContactItem selected={selectedContact?.id === contact.id} onClick={(e) => handleSelectContact(e, contact)} key={contact.id} sx={{ padding: "10px", borderBottom: "1px solid lightgray" }}>
                    {contact.name} {!!contact?.newMessages && contact.newMessages > 0 && <span>({contact.newMessages})</span>}
                    <Button variant="contained" size="small" onClick={(e) => handleDeleteContact(e, contact)}><DeleteIcon /></Button>
                </StyledContactItem>
            ))}
        </Box>
    );
};

const StyledContactItem = styled(Box) <{ selected: boolean }>`
display: flex;
justify-content: space-between;
    cursor: pointer;
    &:hover {
        background-color: ${({ selected }) => selected ? "black" : "lightgray"};
    }
    background-color: ${({ selected }) => selected ? "black" : "white"};
    color: ${({ selected }) => selected ? "white" : "black"};
    font-weight: ${({ selected }) => selected ? "bold" : "normal"};
`;

export default Contacts;