#!/usr/bin/env python

import imaplib, sys

def check_imap_folder(host, user, passwd, foldername):
    imap = imaplib.IMAP4_SSL(host, 993)
    imap.login(user, passwd)
    typ, data = imap.select(foldername, 1)
    typ, data = imap.search(None, 'UNSEEN')
    unseen_messages = len(data[0].split())
    imap.logout()
    return unseen_messages

def main(email, password):
    # collect the details from the user
    print check_imap_folder("imap.gmail.com", email, password, "INBOX")

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
