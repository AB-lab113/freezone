FROM ipfs/kubo:latest
COPY start.sh /start.sh
RUN chmod +x /start.sh
EXPOSE 4001 5001 8080
ENTRYPOINT ["/bin/sh", "/start.sh"]
