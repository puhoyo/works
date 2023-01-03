#pragma once

#include <memory>
#include <string>

namespace IocpGameServer {
	class User;

	class PacketHandlerBase {
	public:
		virtual ~PacketHandlerBase() {};
		virtual void handle(std::shared_ptr<User> user, std::string data) = 0;
	};


} //namespace IocpGameServer