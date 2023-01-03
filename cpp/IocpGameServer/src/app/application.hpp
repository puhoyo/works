#pragma once
#include <map>
#include <unordered_map>
#include <memory>
#include <WinSock2.h>
#include <shared_mutex>
#include "apis/include/packet_handler_base.hpp"

namespace IocpGameServer {
	class User;
	class Socket;

	class Application {
		std::unordered_map<SOCKET, std::shared_ptr<Socket>> sockets_;
		std::map<unsigned char, std::unique_ptr<PacketHandlerBase>> packet_handlers_;
		bool logging_ = false;
		mutable std::shared_mutex lock_;
	public:
		Application(bool logging);
		//static Application& CreateApp(bool logging);
		void AddSocket(SOCKET socket_id, std::shared_ptr<Socket> socket);
		void DeleteSocket(SOCKET socket_id);
		std::shared_ptr<Socket> GetSocket(SOCKET socket_id) noexcept;
		bool IsLogging() { return logging_; }
		void ChatBroadcast(const unsigned char protocol, const std::string& chat_message) const;
		PacketHandlerBase& GetPacketHandler(const unsigned char protocol) noexcept;
		void Console(std::string message) { if (logging_) puts(message.c_str()); }
	};

} //namespace IocpGameServer