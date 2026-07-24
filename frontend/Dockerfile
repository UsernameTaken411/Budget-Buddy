# Frontend image: build with Vite, serve the static bundle with nginx.
#
# VITE_* vars are baked in at BUILD time, not runtime — a Vite build inlines
# them into the bundle. So they must be passed as build args:
#
#   docker build ./frontend -t finance-web \
#     --build-arg VITE_SUPABASE_URL=https://xxxx.supabase.co \
#     --build-arg VITE_SUPABASE_ANON_KEY=eyJ... \
#     --build-arg VITE_API_BASE_URL=https://your-api.azurecontainerapps.io/api
#
# Owner: Person A.

FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_BASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
