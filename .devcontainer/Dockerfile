# Set the base image to Ubuntu
FROM Ubuntu 20.04


# Set environment variables
ENV TIMEZONE=America/Santo_Domingo
ENV DEBIAN_FRONTEND=noninteractive
ENV USER screeps
ENV HOME /data/screeps

################## BEGIN INSTALLATION ######################

# Update and install prerequisites
RUN apt update \
 && apt upgrade -y \
 && apt install -y --no-install-recommends \
    apt-transport-https \
    build-essential \
    ca-certificates \
    curl \
    dirmngr \
    g++ \
    gcc \
    git \
    tcl \
    make \
    lsb-release \
 && apt clean

# Install NodeJS
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash \
 && apt update \
 && apt install -y nodejs \
 && apt clean

# Create Screeps user
RUN adduser --disabled-password --gecos "" --home $HOME $USER

# Set working directory
WORKDIR $HOME
RUN npm install -g rollup

