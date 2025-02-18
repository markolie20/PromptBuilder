FROM python:3.12

# Set working directory
WORKDIR /app

# Copy requirements file first for caching optimization
COPY src/requirements.txt /app/

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . /app

# Expose application port
EXPOSE 8080

# Run the application
CMD ["python", "src/run_server.py"]
