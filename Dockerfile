# Use an official Node.js runtime as a base image
FROM node:16

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the rest of your action code
COPY . .

# Set environment variables that will be required by the action
# These should be set at runtime, but can be defined here for defaults
ENV AKTO_DASHBOARD_URL=""
ENV AKTO_API_KEY=""
ENV AKTO_TEST_ID=""
ENV START_TIME_DELAY=0
ENV OVERRIDDEN_TEST_APP_URL=""
ENV WAIT_TIME_FOR_RESULT=0
ENV BLOCK_LEVEL="NONE"
ENV GITHUB_COMMIT_ID=""

# Command to run the action
CMD ["node", "index.js"]
