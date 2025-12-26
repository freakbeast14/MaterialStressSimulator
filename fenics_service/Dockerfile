FROM quay.io/fenicsproject/stable:current

WORKDIR /app
COPY fenics_service/requirements.txt /app/requirements.txt
RUN python3 -m pip install --no-cache-dir -r /app/requirements.txt

COPY fenics_service /app/fenics_service

ENV PYTHONUNBUFFERED=1
CMD ["bash", "-lc", "uvicorn fenics_service.main:app --host 0.0.0.0 --port ${PORT:-8001}"]